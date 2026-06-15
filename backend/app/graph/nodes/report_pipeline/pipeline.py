import json
from typing import Any

from app.graph.qc_utils import unknowns_from_coverage
from app.graph.research_context import serialize_research_for_llm
from app.providers import openai_client
from app.schemas import normalize_report_content

from app.config import get_settings
from app.providers.firecrawl import firecrawl_client

from .extractors import (
    extract_product_page_research,
    extract_products,
    extract_snapshot,
    extract_sources,
    risks_from_analysis,
    signals_from_analysis,
    stakeholders_from_analysis,
    structured_to_legacy,
)
from .prompts import (
    COMPANY_OVERVIEW_SYSTEM,
    DISCOVERY_SYSTEM,
    OUTREACH_SYSTEM,
    PRODUCTS_SERVICES_SYSTEM,
    SIGNALS_RISKS_SYSTEM,
    STAKEHOLDER_SYSTEM,
)


def _parse_json_payload(result: Any) -> dict[str, Any]:
    if isinstance(result, dict):
        return result
    return {}


async def _enrich_product_research(
    state: dict[str, Any],
    base_snippet: str,
) -> tuple[str, int, float]:
    """Scrape product/solution pages when research content is thin."""
    if len(base_snippet) >= 2500:
        return base_snippet, 0, 0.0

    if not get_settings().firecrawl_api_key or not state.get("website"):
        return base_snippet, 0, 0.0

    website = str(state["website"])
    urls = [
        url
        for url in firecrawl_client.guess_priority_urls(website)
        if any(keyword in url.lower() for keyword in ("product", "solution", "pricing"))
    ]
    if not urls:
        urls = firecrawl_client.guess_priority_urls(website)[:1]

    extra_parts = [base_snippet]
    total_tokens = 0
    total_cost = 0.0
    for url in urls[:2]:
        result, tokens, cost = await firecrawl_client.scrape(url)
        total_tokens += tokens
        total_cost += cost
        content = str(result.get("content", "")).strip()
        if content and not content.startswith("Configure FIRECRAWL"):
            extra_parts.append(f"\n--- Scraped {url} ---\n{content[:6000]}")

    return "\n".join(extra_parts)[:12000], total_tokens, total_cost


async def run_report_pipeline(state: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any], int, float]:
    """Run multi-step report assembly. Returns report, node_outputs patch, tokens, cost."""
    analysis = state.get("business_signals") or {}
    node_outputs = dict(state.get("node_outputs", {}))
    total_tokens = 0
    total_cost = 0.0

    snapshot = extract_snapshot(state)
    node_outputs["report_snapshot"] = {"sections": ["company_snapshot", "commercial_profile"]}

    research_snippet = serialize_research_for_llm(state.get("raw_research", []), max_total_chars=8000)
    overview_result, tokens, cost = await openai_client.complete_json(
        COMPANY_OVERVIEW_SYSTEM,
        f"Company: {state['company_name']}\nWebsite: {state['website']}\n"
        f"Snapshot:\n{json.dumps(snapshot, indent=2)}\n\n"
        f"Analysis:\n{json.dumps(analysis, indent=2)[:6000]}\n\n"
        f"Research:\n{research_snippet}",
    )
    total_tokens += tokens
    total_cost += cost
    company_overview = _parse_json_payload(overview_result)
    node_outputs["report_company_overview"] = {
        "metrics": len(company_overview.get("key_metrics", [])),
        "news": len(company_overview.get("recent_news", [])),
    }

    products = extract_products(state)

    product_research = extract_product_page_research(state)
    product_research, scrape_tokens, scrape_cost = await _enrich_product_research(state, product_research)
    total_tokens += scrape_tokens
    total_cost += scrape_cost

    products_result, tokens, cost = await openai_client.complete_json(
        PRODUCTS_SERVICES_SYSTEM,
        f"Company: {state['company_name']}\nWebsite: {state['website']}\n"
        f"Existing products extract:\n{json.dumps(products.get('products', [])[:6], indent=2)}\n\n"
        f"Product page research & scrapes:\n{product_research}\n\n"
        f"Analysis:\n{json.dumps(analysis, indent=2)[:4000]}",
    )
    total_tokens += tokens
    total_cost += cost
    products_services = _parse_json_payload(products_result)

    core_products = products_services.get("core_products") or []
    if core_products:
        products["products"] = [
            {
                "name": str(item.get("name", "Product"))[:80],
                "type": str(item.get("category", "Product"))[:40],
                "description": str(item.get("description", ""))[:500],
                "tag": str(item.get("category_color", ""))[:20],
                "features": [str(f) for f in (item.get("features") or [])[:5]],
            }
            for item in core_products[:8]
            if isinstance(item, dict)
        ]

    node_outputs["report_products"] = {
        "product_count": len(products.get("products", [])),
        "segment_count": len(products.get("target_customers", [])),
        "core_products": len(core_products),
        "scraped_chars": len(product_research),
    }

    research_snippet = serialize_research_for_llm(state.get("raw_research", []), max_total_chars=6000)
    people_seed = json.dumps(analysis.get("key_people", []), indent=2)[:3000]

    stakeholder_result, tokens, cost = await openai_client.complete_json(
        STAKEHOLDER_SYSTEM,
        f"Company: {state['company_name']}\nResearch:\n{research_snippet}\n\nKey people seed:\n{people_seed}",
    )
    total_tokens += tokens
    total_cost += cost
    stakeholders = _parse_json_payload(stakeholder_result).get("stakeholders") or stakeholders_from_analysis(analysis)
    node_outputs["report_stakeholders"] = {"count": len(stakeholders)}

    signals_seed = json.dumps(
        {
            "signals": signals_from_analysis(analysis),
            "risks": risks_from_analysis(analysis),
        },
        indent=2,
    )[:8000]
    signals_result, tokens, cost = await openai_client.complete_json(
        SIGNALS_RISKS_SYSTEM,
        f"Company: {state['company_name']}\nRefine these signals/risks:\n{signals_seed}\n\nResearch:\n{research_snippet[:4000]}",
    )
    total_tokens += tokens
    total_cost += cost
    signals_payload = _parse_json_payload(signals_result)
    signals = signals_payload.get("signals") or signals_from_analysis(analysis)
    risks = signals_payload.get("risks") or risks_from_analysis(analysis)
    node_outputs["report_signals_risks"] = {"signals": len(signals), "risks": len(risks)}

    discovery_result, tokens, cost = await openai_client.complete_json(
        DISCOVERY_SYSTEM,
        f"Company: {state['company_name']}\nSignals:\n{json.dumps(signals, indent=2)}\n"
        f"Risks:\n{json.dumps(risks, indent=2)}\n"
        f"Stakeholders:\n{json.dumps(stakeholders[:3], indent=2)}",
    )
    total_tokens += tokens
    total_cost += cost
    discovery_questions = _parse_json_payload(discovery_result).get("discovery_questions") or []
    node_outputs["report_discovery"] = {"count": len(discovery_questions)}

    outreach_result, tokens, cost = await openai_client.complete_json(
        OUTREACH_SYSTEM,
        f"Company: {state['company_name']}\nStakeholders:\n{json.dumps(stakeholders[:3], indent=2)}\n"
        f"Top signals:\n{json.dumps(signals[:3], indent=2)}\n"
        f"Discovery:\n{json.dumps(discovery_questions[:4], indent=2)}",
    )
    total_tokens += tokens
    total_cost += cost
    outreach_payload = _parse_json_payload(outreach_result)
    outreach = {k: v for k, v in outreach_payload.items() if k != "unknowns"}
    outreach_unknowns = outreach_payload.get("unknowns") or []
    node_outputs["report_outreach"] = {"sequence_steps": len(outreach.get("sequence", []))}

    sources = extract_sources(state)
    node_outputs["report_sources"] = {"count": len(sources)}

    qc = state.get("node_outputs", {}).get("quality_check", {})
    qc_unknowns = unknowns_from_coverage(qc.get("section_coverage", {}))
    unknowns = list(dict.fromkeys([*qc_unknowns, *[str(u) for u in outreach_unknowns if u]]))[:8]

    header = snapshot.copy()
    header.pop("company_snapshot", None)
    header.pop("commercial_profile", None)
    trigger = risks[0] if risks else None
    if trigger:
        header["trigger_event"] = {
            "label": str(trigger.get("title", "Key risk identified"))[:80],
            "severity": "critical" if int(trigger.get("severity", 3)) >= 4 else "high",
        }

    if company_overview.get("description"):
        snapshot["company_snapshot"]["description"] = company_overview.get("description")
    if company_overview.get("ceo"):
        snapshot["company_snapshot"]["ceo"] = company_overview.get("ceo")
    if company_overview.get("company_type"):
        snapshot["company_snapshot"]["company_type"] = company_overview.get("company_type")
    if company_overview.get("latest_funding"):
        snapshot["company_snapshot"]["latest_funding"] = company_overview.get("latest_funding")

    structured: dict[str, Any] = {
        "header": header,
        "company_snapshot": snapshot["company_snapshot"],
        "commercial_profile": snapshot["commercial_profile"],
        "company_overview": company_overview,
        "products_services": products_services,
        "products": products["products"],
        "target_customers": products["target_customers"],
        "stakeholders": stakeholders,
        "signals": signals,
        "risks": risks,
        "discovery_questions": discovery_questions,
        "outreach": outreach,
        "unknowns": unknowns,
        "sources": sources,
    }

    report = structured_to_legacy(structured)
    report = normalize_report_content(report)
    report["structured"] = structured

    node_outputs["report_generator"] = {
        "sections": list(report.keys()),
        "pipeline_nodes": [
            "report_snapshot",
            "report_company_overview",
            "report_products_services",
            "report_products",
            "report_stakeholders",
            "report_signals_risks",
            "report_discovery",
            "report_outreach",
            "report_sources",
        ],
        "qc_unknowns_merged": len(qc_unknowns),
    }

    return report, node_outputs, total_tokens, total_cost
