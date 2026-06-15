import json
from typing import Any

from app.graph.qc_utils import unknowns_from_coverage
from app.providers import openai_client
from app.schemas import normalize_report_content

REPORT_SYSTEM = """You are a sales research report writer. Generate a comprehensive meeting briefing as JSON.
Required keys (all mandatory):
- company_overview: string (2-3 paragraphs)
- products_services: string (detailed; include business model type when known)
- target_customers: string (ICP description; name customers or segments when found)
- business_signals: string (formatted list of key signals with evidence)
- risks_challenges: string (formatted list with severity when known)
- discovery_questions: list of 8-12 specific questions for the sales meeting
- outreach_strategy: string structured as a short playbook with: recommended channel, hook sentence,
  and a Day 1 / Day 4 / Day 8 follow-up sequence
- unknowns: list of 3-6 things that need validation in the meeting
- sources: list of objects with {title, url, snippet} from the research data

Discovery question rules — each question MUST:
- Reference a specific signal or fact from the research (name it explicitly)
- Be open-ended (never yes/no)
- Sound like a senior rep, not a generic survey

BAD: "What challenges are you facing?"
GOOD: "I saw you're hiring several SDRs in EMEA — what's driving that expansion and how is your stack supporting it?"

Base all content on the provided research. Do not invent facts not supported by research.
Return ONLY valid JSON."""


async def report_generator_node(state: dict[str, Any]) -> dict[str, Any]:
    research = json.dumps(state.get("raw_research", []), indent=2)[:10000]
    analysis = json.dumps(state.get("business_signals", {}), indent=2)[:6000]
    qc = state.get("node_outputs", {}).get("quality_check", {})
    qc_unknowns = unknowns_from_coverage(qc.get("section_coverage", {}))

    user_prompt = f"""Company: {state['company_name']}
Website: {state['website']}
Objective: {state['objective']}

Research Data:
{research}

Business Analysis:
{analysis}

Quality gaps to reflect in unknowns (if still applicable):
{json.dumps(qc_unknowns, indent=2)}

Generate the complete structured research report."""

    report, tokens, cost = await openai_client.complete_json(REPORT_SYSTEM, user_prompt)
    report = normalize_report_content(report)

    llm_unknowns = report.get("unknowns", [])
    if not isinstance(llm_unknowns, list):
        llm_unknowns = [str(llm_unknowns)] if llm_unknowns else []
    merged_unknowns = list(dict.fromkeys([*qc_unknowns, *[str(u) for u in llm_unknowns if u]]))
    report["unknowns"] = merged_unknowns[:8]

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
    node_outputs["report_generator"] = {
        "sections": list(report.keys()),
        "qc_unknowns_merged": len(qc_unknowns),
    }

    return {
        "report": report,
        "status": "completed",
        "node_outputs": node_outputs,
        "total_tokens": state.get("total_tokens", 0) + tokens,
        "total_cost_usd": state.get("total_cost_usd", 0.0) + cost,
    }
