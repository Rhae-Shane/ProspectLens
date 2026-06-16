import json
from typing import Any

from app.config import get_settings
from app.graph.research_context import serialize_research_for_llm
from app.graph.qc_utils import (
    REQUIRED_SECTIONS,
    blend_coverage,
    count_unique_sources,
    deterministic_section_coverage,
    recovery_queries_for_sections,
    unknowns_from_coverage,
)
from app.providers import openai_client

settings = get_settings()

QC_SYSTEM = """You are a quality assurance analyst for sales research reports.
Evaluate the research data quality and return JSON with:
- quality_score: float 0.0-1.0 (overall readiness for report generation)
- quality_issues: list of specific gaps or problems
- section_coverage: object mapping each required section to coverage score 0.0-1.0
  Required sections: company_overview, products_services, target_customers,
  business_signals, risks_challenges, discovery_questions, outreach_strategy, unknowns, sources
- source_count: integer count of unique sources found
- recommendation: "proceed" or "retry_research"

Score section_coverage below 0.6 when data for that section is missing, generic, or weak.
Score below 0.75 overall if: fewer than 3 sources, missing key sections, or insufficient company-specific data.
Return ONLY valid JSON."""


def _overall_from_coverage(coverage: dict[str, float]) -> float:
    if not coverage:
        return 0.0
    return round(sum(coverage.values()) / len(coverage), 3)


async def quality_check_node(state: dict[str, Any]) -> dict[str, Any]:
    research = state.get("raw_research", [])
    analysis = state.get("business_signals", {})
    company = state["company_name"]

    # --- Deterministic evidence (does not depend on LLM mood) ---
    unique_sources = count_unique_sources(research)
    deterministic = deterministic_section_coverage(analysis, research, unique_sources)

    # --- LLM judgment for nuance the heuristics can't capture ---
    user_prompt = f"""Company: {company}
Retry Count: {state.get('retry_count', 0)}
Unique sources found: {unique_sources}

Research Data:
{serialize_research_for_llm(research, max_total_chars=16000)}

Analysis:
{json.dumps(analysis, indent=2)[:4000]}

Evaluate quality for report generation."""

    qc_result, tokens, cost = await openai_client.complete_json(QC_SYSTEM, user_prompt)

    llm_coverage = qc_result.get("section_coverage", {}) or {}
    section_coverage = blend_coverage(llm_coverage, deterministic, llm_weight=0.5)

    # Blend overall: average the LLM's overall read with the evidence-based mean.
    det_overall = _overall_from_coverage(deterministic)
    try:
        llm_overall = float(qc_result.get("quality_score", det_overall))
    except (TypeError, ValueError):
        llm_overall = det_overall
    quality_score = round(0.5 * llm_overall + 0.5 * det_overall, 3)

    # Hard floor: never proceed as "high quality" with too few real sources.
    if unique_sources < 3:
        quality_score = min(quality_score, 0.5)

    suggested_unknowns = unknowns_from_coverage(section_coverage)
    recovery_queries = recovery_queries_for_sections(company, section_coverage)

    qc_result["section_coverage"] = section_coverage
    qc_result["deterministic_coverage"] = deterministic
    qc_result["source_count"] = unique_sources
    qc_result["suggested_unknowns"] = suggested_unknowns
    qc_result["recovery_queries"] = recovery_queries
    qc_result["quality_score"] = quality_score

    node_outputs = dict(state.get("node_outputs", {}))
    node_outputs["quality_check"] = qc_result

    return {
        "quality_score": quality_score,
        "quality_issues": qc_result.get("quality_issues", []),
        "section_coverage": section_coverage,
        "source_count": unique_sources,
        "qc_unknowns": suggested_unknowns,
        "qc_recovery_queries": recovery_queries,
        "node_outputs": node_outputs,
        "total_tokens": state.get("total_tokens", 0) + tokens,
        "total_cost_usd": state.get("total_cost_usd", 0.0) + cost,
    }


def route_after_quality(state: dict[str, Any]) -> str:
    score = state.get("quality_score", 0.0)
    retries = state.get("retry_count", 0)

    if retries >= settings.max_retries:
        return "report_generator"
    if score >= settings.quality_threshold:
        return "report_generator"

    # Only attempt recovery if we actually have a focused plan to improve things.
    weak_sections = [
        s for s in REQUIRED_SECTIONS if float(state.get("section_coverage", {}).get(s, 1.0)) < 0.6
    ]
    if not weak_sections and not state.get("qc_recovery_queries"):
        return "report_generator"
    return "recovery"
