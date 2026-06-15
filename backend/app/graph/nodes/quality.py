import json
from typing import Any

from app.config import get_settings
from app.graph.qc_utils import unknowns_from_coverage
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


async def quality_check_node(state: dict[str, Any]) -> dict[str, Any]:
    research = state.get("raw_research", [])
    analysis = state.get("business_signals", {})

    user_prompt = f"""Company: {state['company_name']}
Retry Count: {state.get('retry_count', 0)}

Research Data:
{json.dumps(research, indent=2)[:8000]}

Analysis:
{json.dumps(analysis, indent=2)[:4000]}

Evaluate quality for report generation."""

    qc_result, tokens, cost = await openai_client.complete_json(QC_SYSTEM, user_prompt)
    suggested_unknowns = unknowns_from_coverage(qc_result.get("section_coverage", {}))
    qc_result["suggested_unknowns"] = suggested_unknowns

    node_outputs = dict(state.get("node_outputs", {}))
    node_outputs["quality_check"] = qc_result

    return {
        "quality_score": float(qc_result.get("quality_score", 0.5)),
        "quality_issues": qc_result.get("quality_issues", []),
        "qc_unknowns": suggested_unknowns,
        "node_outputs": node_outputs,
        "total_tokens": state.get("total_tokens", 0) + tokens,
        "total_cost_usd": state.get("total_cost_usd", 0.0) + cost,
    }


def route_after_quality(state: dict[str, Any]) -> str:
    score = state.get("quality_score", 0.0)
    retries = state.get("retry_count", 0)
    if score >= settings.quality_threshold or retries >= settings.max_retries:
        return "report_generator"
    return "recovery"
