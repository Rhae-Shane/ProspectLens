from typing import Any

from app.providers import openai_client

PLANNER_SYSTEM = """You are a sales research planner. Given a company and research objective,
create a structured research plan as JSON with these keys:
- queries: list of 4-6 specific web research queries
- signal_categories: list of business signal types to look for
- report_outline: list of section names to cover
- focus_areas: list of 2-3 priority investigation areas

Return ONLY valid JSON, no markdown."""


async def planner_node(state: dict[str, Any]) -> dict[str, Any]:
    user_prompt = f"""Company: {state['company_name']}
Website: {state['website']}
Research Objective: {state['objective']}

Create a comprehensive research plan for a sales meeting briefing."""

    plan, tokens, cost = await openai_client.complete_json(PLANNER_SYSTEM, user_prompt)

    node_outputs = dict(state.get("node_outputs", {}))
    node_outputs["planner"] = plan

    return {
        "research_plan": plan,
        "node_outputs": node_outputs,
        "total_tokens": state.get("total_tokens", 0) + tokens,
        "total_cost_usd": state.get("total_cost_usd", 0.0) + cost,
    }
