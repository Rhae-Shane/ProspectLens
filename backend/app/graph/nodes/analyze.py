import json
from typing import Any

from app.graph.research_context import serialize_research_for_llm
from app.providers import openai_client

ANALYZE_SYSTEM = """You are a business analyst extracting structured insights from research data.
Extract as much grounded, specific structure as the research supports. Return JSON with these keys:
- products_services: string summary including B2B/B2C/SaaS/services classification when evidence exists
- target_customers: string summary of ICP, buyer vs user, and named customers if found
- named_customers: list of specific customer/company names mentioned as customers (empty list if none)
- customer_segments: list of objects {segment, description} describing distinct customer groups
- business_signals: list of objects with {signal, signal_type, evidence, relevance, sentiment}
  signal_type must be one of: Hiring, Funding, Product Launch, Leadership Change, Customer Win,
  Negative Sentiment, Partnership, Expansion, Other
  sentiment must be one of: positive, neutral, risk
- signal_categories: list of objects {category, count} aggregating business_signals by signal_type
- risks_challenges: list of objects with {risk, risk_category, severity, likelihood, evidence}
  risk_category must be one of: Market, Competitive, Operational, Financial, Reputation, Regulatory, Technology, Other
  severity must be an integer 1-5 (5 = highest); likelihood must be an integer 1-5
- competitive_landscape: string summary
- competitors: list of competitor company names
- key_people: list of objects {name, title, note} for notable executives if found
- financial_signals: string summary if available
- key_metrics: list of objects {label, value} for any concrete metrics found (revenue, employees, customers, funding)

Use ONLY evidence from the research; never invent companies, people, or numbers. Leave a field as an
empty list/string when the research does not support it. Return ONLY valid JSON."""


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
