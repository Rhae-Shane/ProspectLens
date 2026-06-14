import json
from typing import Any

from app.providers import openai_client

REPORT_SYSTEM = """You are a sales research report writer. Generate a comprehensive meeting briefing as JSON.
Required keys (all mandatory):
- company_overview: string (2-3 paragraphs)
- products_services: string (detailed)
- target_customers: string (ICP description)
- business_signals: string (formatted list of key signals)
- risks_challenges: string (formatted list)
- discovery_questions: list of 8-12 specific questions for the sales meeting
- outreach_strategy: string (actionable outreach recommendations)
- unknowns: list of 3-6 things that need validation in the meeting
- sources: list of objects with {title, url, snippet} from the research data

Base all content on the provided research. Do not invent facts not supported by research.
Return ONLY valid JSON."""


async def report_generator_node(state: dict[str, Any]) -> dict[str, Any]:
    research = json.dumps(state.get("raw_research", []), indent=2)[:10000]
    analysis = json.dumps(state.get("business_signals", {}), indent=2)[:6000]

    user_prompt = f"""Company: {state['company_name']}
Website: {state['website']}
Objective: {state['objective']}

Research Data:
{research}

Business Analysis:
{analysis}

Generate the complete structured research report."""

    report, tokens, cost = await openai_client.complete_json(REPORT_SYSTEM, user_prompt)

    # Collect all sources from research
    all_sources = []
    seen_urls = set()
    for item in state.get("raw_research", []):
        for src in item.get("sources", []):
            url = src.get("url", "")
            if url and url not in seen_urls:
                seen_urls.add(url)
                all_sources.append(src)

    if "sources" not in report or not report["sources"]:
        report["sources"] = all_sources[:10]
    else:
        for src in all_sources:
            url = src.get("url", "")
            if url and url not in {s.get("url") for s in report["sources"]}:
                report["sources"].append(src)

    node_outputs = dict(state.get("node_outputs", {}))
    node_outputs["report_generator"] = {"sections": list(report.keys())}

    return {
        "report": report,
        "status": "completed",
        "node_outputs": node_outputs,
        "total_tokens": state.get("total_tokens", 0) + tokens,
        "total_cost_usd": state.get("total_cost_usd", 0.0) + cost,
    }
