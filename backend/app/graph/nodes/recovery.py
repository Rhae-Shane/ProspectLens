from typing import Any

from app.providers import openai_client

RECOVERY_SYSTEM = """You are a research recovery specialist. Given quality issues from a failed QC check,
generate improved research queries. Return JSON with:
- additional_queries: list of 2-4 targeted queries to fill gaps
- rationale: string explaining the recovery strategy

Return ONLY valid JSON."""


async def recovery_node(state: dict[str, Any]) -> dict[str, Any]:
    issues = state.get("quality_issues", [])
    plan = state.get("research_plan", {})

    user_prompt = f"""Company: {state['company_name']}
Website: {state['website']}
Objective: {state['objective']}
Retry Count: {state.get('retry_count', 0)}

Quality Issues:
{chr(10).join(f'- {i}' for i in issues)}

Current Plan:
{plan}

Generate recovery queries to address quality gaps."""

    recovery, tokens, cost = await openai_client.complete_json(RECOVERY_SYSTEM, user_prompt)

    updated_plan = dict(plan)
    existing_queries = list(updated_plan.get("queries", []))
    additional = recovery.get("additional_queries", [])
    updated_plan["queries"] = existing_queries + additional
    updated_plan["recovery_rationale"] = recovery.get("rationale", "")

    node_outputs = dict(state.get("node_outputs", {}))
    node_outputs["recovery"] = recovery

    return {
        "research_plan": updated_plan,
        "retry_count": state.get("retry_count", 0) + 1,
        "node_outputs": node_outputs,
        "total_tokens": state.get("total_tokens", 0) + tokens,
        "total_cost_usd": state.get("total_cost_usd", 0.0) + cost,
    }
