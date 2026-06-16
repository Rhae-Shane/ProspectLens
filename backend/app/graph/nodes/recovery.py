from typing import Any

from app.providers import openai_client

RECOVERY_SYSTEM = """You are a research recovery specialist. Given quality issues and the
specific report sections that are under-covered, generate improved, highly targeted
research queries that would fill those exact gaps. Return JSON with:
- additional_queries: list of 2-4 targeted queries to fill the named gaps
- rationale: string explaining the recovery strategy

Write queries a search engine can answer well (company name + concrete topic).
Return ONLY valid JSON."""


async def recovery_node(state: dict[str, Any]) -> dict[str, Any]:
    issues = state.get("quality_issues", [])
    plan = state.get("research_plan", {})
    section_coverage = state.get("section_coverage", {})
    weak_sections = [s for s, score in section_coverage.items() if _safe_float(score) < 0.6]

    # Deterministic, section-targeted queries computed in the QC node.
    seed_queries = list(state.get("qc_recovery_queries", []))

    user_prompt = f"""Company: {state['company_name']}
Website: {state['website']}
Objective: {state['objective']}
Retry Count: {state.get('retry_count', 0)}

Under-covered sections: {', '.join(weak_sections) or 'none flagged'}

Quality Issues:
{chr(10).join(f'- {i}' for i in issues) or '- none provided'}

Existing targeted queries:
{chr(10).join(f'- {q}' for q in seed_queries) or '- none'}

Generate additional recovery queries that fill the named section gaps without
duplicating the existing targeted queries."""

    recovery, tokens, cost = await openai_client.complete_json(RECOVERY_SYSTEM, user_prompt)

    llm_queries = [str(q) for q in (recovery.get("additional_queries") or []) if str(q).strip()]

    # Merge deterministic + LLM queries, dedupe, cap to keep retries cheap.
    recovery_queries = list(dict.fromkeys([*seed_queries, *llm_queries]))[:6]

    updated_plan = dict(plan)
    updated_plan["recovery_queries"] = recovery_queries
    updated_plan["recovery_rationale"] = recovery.get("rationale", "")

    node_outputs = dict(state.get("node_outputs", {}))
    node_outputs["recovery"] = {
        "weak_sections": weak_sections,
        "recovery_queries": recovery_queries,
        "rationale": recovery.get("rationale", ""),
    }

    return {
        "research_plan": updated_plan,
        "retry_count": state.get("retry_count", 0) + 1,
        "node_outputs": node_outputs,
        "total_tokens": state.get("total_tokens", 0) + tokens,
        "total_cost_usd": state.get("total_cost_usd", 0.0) + cost,
    }


def _safe_float(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 1.0
