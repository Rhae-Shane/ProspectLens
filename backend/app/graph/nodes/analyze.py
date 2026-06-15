import json
from typing import Any

from app.graph.research_context import serialize_research_for_llm
from app.providers import openai_client

ANALYZE_SYSTEM = """You are a business analyst extracting structured insights from research data.
Return JSON with these keys:
- products_services: string summary including B2B/B2C/SaaS/services classification when evidence exists
- target_customers: string summary of ICP, buyer vs user, and named customers if found
- business_signals: list of objects with {signal, signal_type, evidence, relevance}
  signal_type must be one of: Hiring, Funding, Product Launch, Leadership Change, Customer Win,
  Negative Sentiment, Partnership, Expansion, Other
- risks_challenges: list of objects with {risk, risk_category, severity, evidence}
  risk_category must be one of: Market, Competitive, Operational, Financial, Reputation, Other
  severity must be an integer 1-5 (5 = highest)
- competitive_landscape: string summary
- key_people: list of notable executives if found
- financial_signals: string summary if available

Use only evidence from the research. Return ONLY valid JSON."""


async def analyze_node(state: dict[str, Any]) -> dict[str, Any]:
    research_text = serialize_research_for_llm(state.get("raw_research", []))
    plan = json.dumps(state.get("research_plan", {}), indent=2)[:4000]

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
