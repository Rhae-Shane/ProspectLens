import json
from typing import Any

from app.providers import openai_client

ANALYZE_SYSTEM = """You are a business analyst extracting structured insights from research data.
Return JSON with these keys:
- products_services: string summary
- target_customers: string summary
- business_signals: list of objects with {signal, evidence, relevance}
- risks_challenges: list of objects with {risk, severity, evidence}
- competitive_landscape: string summary
- key_people: list of notable executives if found
- financial_signals: string summary if available

Return ONLY valid JSON."""


async def analyze_node(state: dict[str, Any]) -> dict[str, Any]:
    research_text = json.dumps(state.get("raw_research", []), indent=2)
    plan = json.dumps(state.get("research_plan", {}), indent=2)

    user_prompt = f"""Company: {state['company_name']}
Website: {state['website']}
Objective: {state['objective']}

Research Plan:
{plan}

Raw Research Data:
{research_text}

Extract structured business analysis from this research."""

    analysis, tokens, cost = await openai_client.complete_json(ANALYZE_SYSTEM, user_prompt)

    node_outputs = dict(state.get("node_outputs", {}))
    node_outputs["analyze"] = {"signals_count": len(analysis.get("business_signals", []))}

    return {
        "business_signals": analysis,
        "node_outputs": node_outputs,
        "total_tokens": state.get("total_tokens", 0) + tokens,
        "total_cost_usd": state.get("total_cost_usd", 0.0) + cost,
    }
