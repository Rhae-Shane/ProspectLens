import asyncio
import json
import re
from typing import Any

from app.graph.qc_utils import unknowns_from_coverage
from app.graph.research_context import serialize_research_for_llm
from app.providers import apollo_client, openai_client
from app.schemas import normalize_report_content

from app.config import get_settings
from app.providers.firecrawl import firecrawl_client

from .extractors import (
    extract_product_page_research,
    extract_products,
    extract_snapshot,
    extract_sources,
    extract_stakeholder_research,
    risks_from_analysis,
    signals_from_analysis,
    stakeholders_from_analysis,
    structured_to_legacy,
)
from .prompts import (
    BUSINESS_SIGNALS_SYSTEM,
    COMPANY_OVERVIEW_SYSTEM,
    DISCOVERY_SYSTEM,
    DISCOVERY_QUESTIONS_OVERVIEW_SYSTEM,
    OUTREACH_SYSTEM,
    OUTREACH_OVERVIEW_SYSTEM,
    PRODUCTS_SERVICES_SYSTEM,
    RISKS_CHALLENGES_SYSTEM,
    SIGNALS_RISKS_SYSTEM,
    STAKEHOLDER_SYSTEM,
    STAKEHOLDERS_OVERVIEW_SYSTEM,
    TARGET_CUSTOMERS_SYSTEM,
    UNKNOWNS_OVERVIEW_SYSTEM,
    SOURCES_OVERVIEW_SYSTEM,
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


async def _enrich_stakeholder_research(
    state: dict[str, Any],
    base_snippet: str,
) -> tuple[str, list[dict[str, Any]], int, float]:
    """Apollo people search + leadership page scrapes for stakeholder enrichment."""
    total_tokens = 0
    total_cost = 0.0
    apollo_people: list[dict[str, Any]] = []
    extra_parts = [base_snippet]

    people_result, tokens, cost = await apollo_client.search_people(
        str(state.get("company_name", "")),
        str(state.get("website", "")),
        limit=10,
    )
    total_tokens += tokens
    total_cost += cost
    if people_result.get("content"):
        extra_parts.append(f"\n--- Apollo people search ---\n{people_result.get('content', '')[:4000]}")
    apollo_people = people_result.get("people") or []

    if len(base_snippet) < 2000 and get_settings().firecrawl_api_key and state.get("website"):
        website = str(state["website"])
        urls = [
            url
            for url in firecrawl_client.guess_priority_urls(website)
            if any(keyword in url.lower() for keyword in ("about", "team", "leadership", "company"))
        ]
        for url in urls[:2]:
            result, tokens, cost = await firecrawl_client.scrape(url)
            total_tokens += tokens
            total_cost += cost
            content = str(result.get("content", "")).strip()
            if content and not content.startswith("Configure FIRECRAWL"):
                extra_parts.append(f"\n--- Scraped {url} ---\n{content[:6000]}")

    return "\n".join(extra_parts)[:12000], apollo_people, total_tokens, total_cost


def _normalize_person_name(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", name.lower())


def _merge_stakeholder_profiles(
    overview: dict[str, Any],
    apollo_people: list[dict[str, Any]],
    stakeholders: list[dict[str, Any]],
) -> dict[str, Any]:
    """Attach LinkedIn URLs from Apollo and stakeholder research when the overview is missing them."""
    profiles: dict[str, str] = {}
    for person in [*apollo_people, *stakeholders]:
        if not isinstance(person, dict):
            continue
        name = str(person.get("name", "")).strip()
        linkedin = str(person.get("linkedin_url", "")).strip()
        if name and linkedin:
            profiles[_normalize_person_name(name)] = linkedin

    for section in ("executives", "board_members"):
        for item in overview.get(section) or []:
            if not isinstance(item, dict):
                continue
            if str(item.get("linkedin_url", "")).strip():
                continue
            normalized = _normalize_person_name(str(item.get("name", "")))
            if normalized in profiles:
                item["linkedin_url"] = profiles[normalized]
                continue
            for profile_name, linkedin in profiles.items():
                if profile_name in normalized or normalized in profile_name:
                    item["linkedin_url"] = linkedin
                    break

    return overview


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

    target_customers_result, tokens, cost = await openai_client.complete_json(
        TARGET_CUSTOMERS_SYSTEM,
        f"Company: {state['company_name']}\nWebsite: {state['website']}\n"
        f"Existing customer segments:\n{json.dumps(products.get('target_customers', []), indent=2)}\n\n"
        f"Commercial profile:\n{json.dumps(snapshot.get('commercial_profile', {}), indent=2)}\n\n"
        f"Products:\n{json.dumps(products.get('products', [])[:6], indent=2)}\n\n"
        f"Analysis target_customers:\n{str(analysis.get('target_customers', '') or '')[:3000]}\n\n"
        f"Research:\n{research_snippet[:5000]}",
    )
    total_tokens += tokens
    total_cost += cost
    target_customers_overview = _parse_json_payload(target_customers_result)

    overview_segments = target_customers_overview.get("segments") or []
    if overview_segments:
        products["target_customers"] = [
            {
                "segment": str(item.get("name", "Segment"))[:80],
                "detail": str(item.get("description", ""))[:500],
                "named_customers": [str(c) for c in (item.get("example_customers") or [])[:6]],
            }
            for item in overview_segments[:6]
            if isinstance(item, dict)
        ]

    node_outputs["report_target_customers"] = {
        "segments": len(overview_segments),
        "industries": len(target_customers_overview.get("industry_distribution", [])),
        "regions": len(target_customers_overview.get("geographic_regions", [])),
    }

    people_seed = json.dumps(analysis.get("key_people", []), indent=2)[:3000]

    stakeholder_research = extract_stakeholder_research(state)
    stakeholder_research, apollo_people, stake_tokens, stake_cost = await _enrich_stakeholder_research(
        state, stakeholder_research
    )
    total_tokens += stake_tokens
    total_cost += stake_cost

    stakeholder_result, tokens, cost = await openai_client.complete_json(
        STAKEHOLDER_SYSTEM,
        f"Company: {state['company_name']}\nWebsite: {state['website']}\n"
        f"Research:\n{research_snippet}\n\n"
        f"Stakeholder research & scrapes:\n{stakeholder_research}\n\n"
        f"Apollo people seed:\n{json.dumps(apollo_people, indent=2)}\n\n"
        f"Key people seed:\n{people_seed}",
    )
    total_tokens += tokens
    total_cost += cost
    stakeholders = _parse_json_payload(stakeholder_result).get("stakeholders") or stakeholders_from_analysis(analysis)

    stakeholders_overview_result, tokens, cost = await openai_client.complete_json(
        STAKEHOLDERS_OVERVIEW_SYSTEM,
        f"Company: {state['company_name']}\n"
        f"Stakeholders:\n{json.dumps(stakeholders, indent=2)}\n\n"
        f"Apollo people:\n{json.dumps(apollo_people, indent=2)}\n\n"
        f"Research:\n{stakeholder_research[:5000]}",
    )
    total_tokens += tokens
    total_cost += cost
    stakeholders_overview = _parse_json_payload(stakeholders_overview_result)
    stakeholders_overview = _merge_stakeholder_profiles(
        stakeholders_overview,
        apollo_people,
        stakeholders,
    )

    execs = stakeholders_overview.get("executives") or []
    if execs:
        stakeholders = [
            {
                "name": str(item.get("name", "Executive"))[:80],
                "title": str(item.get("title", "Executive"))[:120],
                "tenure": "",
                "previous_company": "",
                "linkedin_url": str(item.get("linkedin_url", ""))[:300],
                "why_matters": str(item.get("background", ""))[:500],
                "conversation_hook": f"Discuss {item.get('focus_areas', ['priorities'])[0] if item.get('focus_areas') else 'priorities'}",
                "focus_areas": [str(f) for f in (item.get("focus_areas") or [])[:4]],
                "background": str(item.get("background", ""))[:500],
                "tag": str(item.get("tag", ""))[:40],
            }
            for item in execs[:7]
            if isinstance(item, dict)
        ]

    node_outputs["report_stakeholders"] = {
        "count": len(stakeholders),
        "executives": len(execs),
        "apollo_people": len(apollo_people),
    }

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

    # Signals and risks dashboards are independent — build them concurrently.
    (
        (signals_overview_result, so_tokens, so_cost),
        (risks_overview_result, ro_tokens, ro_cost),
    ) = await asyncio.gather(
        openai_client.complete_json(
            BUSINESS_SIGNALS_SYSTEM,
            f"Company: {state['company_name']}\n"
            f"Signals seed:\n{json.dumps(signals, indent=2)}\n\n"
            f"Analysis signals:\n{json.dumps(analysis.get('business_signals', []), indent=2)[:4000]}\n\n"
            f"Research:\n{research_snippet[:4000]}",
        ),
        openai_client.complete_json(
            RISKS_CHALLENGES_SYSTEM,
            f"Company: {state['company_name']}\n"
            f"Risks seed:\n{json.dumps(risks, indent=2)}\n\n"
            f"Analysis risks:\n{json.dumps(analysis.get('risks_challenges', []), indent=2)[:4000]}\n\n"
            f"Research:\n{research_snippet[:4000]}",
        ),
    )
    total_tokens += so_tokens + ro_tokens
    total_cost += so_cost + ro_cost
    business_signals = _parse_json_payload(signals_overview_result)
    node_outputs["report_business_signals"] = {
        "key_signals": len(business_signals.get("key_signals", [])),
        "strength": business_signals.get("overall_strength", {}).get("score"),
    }
    risks_challenges = _parse_json_payload(risks_overview_result)
    node_outputs["report_risks_challenges"] = {
        "top_risks": len(risks_challenges.get("top_risks", [])),
        "overall_level": risks_challenges.get("overall_risk_level"),
    }

    discovery_result, tokens, cost = await openai_client.complete_json(
        DISCOVERY_QUESTIONS_OVERVIEW_SYSTEM,
        f"Company: {state['company_name']}\n"
        f"Signals:\n{json.dumps(signals, indent=2)}\n\n"
        f"Risks:\n{json.dumps(risks, indent=2)}\n\n"
        f"Stakeholders:\n{json.dumps(stakeholders[:5], indent=2)}\n\n"
        f"Products:\n{json.dumps(products.get('products', [])[:6], indent=2)}\n\n"
        f"Business signals overview:\n{json.dumps(business_signals.get('key_signals', [])[:8], indent=2)}\n\n"
        f"Research:\n{research_snippet[:4000]}",
    )
    total_tokens += tokens
    total_cost += cost
    discovery_questions_overview = _parse_json_payload(discovery_result)

    overview_questions = discovery_questions_overview.get("questions") or []
    discovery_questions = [
        {
            "question": str(item.get("question", ""))[:500],
            "signal_source": str(item.get("signal_source", item.get("rationale", "")))[:300],
            "targets": str(item.get("targets", item.get("category", "")))[:120],
        }
        for item in overview_questions
        if isinstance(item, dict) and str(item.get("question", "")).strip()
    ]

    node_outputs["report_discovery"] = {
        "count": len(discovery_questions),
        "high_priority": len([q for q in overview_questions if str(q.get("priority", "")).lower() == "high"]),
        "categories": len(discovery_questions_overview.get("categories", [])),
    }

    outreach_result, tokens, cost = await openai_client.complete_json(
        OUTREACH_OVERVIEW_SYSTEM,
        f"Company: {state['company_name']}\n"
        f"Stakeholders:\n{json.dumps(stakeholders[:6], indent=2)}\n\n"
        f"Top signals:\n{json.dumps(signals[:6], indent=2)}\n\n"
        f"Discovery questions:\n{json.dumps(discovery_questions[:6], indent=2)}\n\n"
        f"Target customers:\n{json.dumps(products.get('target_customers', [])[:4], indent=2)}\n\n"
        f"Research:\n{research_snippet[:4000]}",
    )
    total_tokens += tokens
    total_cost += cost
    outreach_payload = _parse_json_payload(outreach_result)
    outreach_unknowns = outreach_payload.pop("unknowns", None) or []
    outreach_overview = {k: v for k, v in outreach_payload.items() if k != "unknowns"}

    strategies = outreach_overview.get("strategies") or []
    personas = outreach_overview.get("target_personas") or []
    themes = outreach_overview.get("messaging_themes") or []
    channels = outreach_overview.get("recommended_channels") or []

    primary_strategy = strategies[0] if strategies and isinstance(strategies[0], dict) else {}
    primary_persona = personas[0] if personas and isinstance(personas[0], dict) else {}
    primary_theme = themes[0] if themes and isinstance(themes[0], dict) else {}
    primary_channel = channels[0] if channels and isinstance(channels[0], dict) else {}

    strategy_channels = primary_strategy.get("primary_channels") or []
    outreach = {
        "channel": (
            ", ".join(str(c) for c in strategy_channels[:2])
            or str(primary_channel.get("name", "Email"))
        )[:120],
        "primary_contact": str(primary_persona.get("persona", ""))[:120],
        "hook": str(primary_theme.get("description", primary_strategy.get("description", "")))[:500],
        "avoid": [],
        "sequence": [
            {
                "day": index + 1,
                "action": str(item.get("name", "Outreach step"))[:200],
                "angle": str(item.get("description", ""))[:300],
            }
            for index, item in enumerate(strategies[:4])
            if isinstance(item, dict)
        ],
    }

    node_outputs["report_outreach"] = {
        "strategies": len(strategies),
        "personas": len(personas),
        "channels": len(channels),
        "impact_score": outreach_overview.get("expected_impact", {}).get("score"),
    }

    qc = state.get("node_outputs", {}).get("quality_check", {})
    qc_unknowns = unknowns_from_coverage(qc.get("section_coverage", {}))
    raw_sources = extract_sources(state)

    # Unknowns and sources dashboards are independent — build them concurrently.
    (
        (unknowns_result, un_tokens, un_cost),
        (sources_result, src_tokens, src_cost),
    ) = await asyncio.gather(
        openai_client.complete_json(
            UNKNOWNS_OVERVIEW_SYSTEM,
            f"Company: {state['company_name']}\n"
            f"QC section coverage:\n{json.dumps(qc.get('section_coverage', {}), indent=2)}\n\n"
            f"QC suggested unknowns:\n{json.dumps(qc_unknowns, indent=2)}\n\n"
            f"Outreach unknowns:\n{json.dumps(outreach_unknowns, indent=2)}\n\n"
            f"Risks:\n{json.dumps(risks[:6], indent=2)}\n\n"
            f"Signals:\n{json.dumps(signals[:6], indent=2)}\n\n"
            f"Discovery gaps:\n{json.dumps(discovery_questions[:4], indent=2)}\n\n"
            f"Research:\n{research_snippet[:4000]}",
        ),
        openai_client.complete_json(
            SOURCES_OVERVIEW_SYSTEM,
            f"Company: {state['company_name']}\nWebsite: {state['website']}\n"
            f"Raw sources ({len(raw_sources)}):\n{json.dumps(raw_sources, indent=2)}\n\n"
            f"Research providers:\n{json.dumps([item.get('provider') for item in state.get('raw_research', [])], indent=2)}\n\n"
            f"QC source count: {qc.get('source_count', len(raw_sources))}\n\n"
            f"Company news from overview:\n{json.dumps(company_overview.get('recent_news', [])[:5], indent=2)}",
        ),
    )
    total_tokens += un_tokens + src_tokens
    total_cost += un_cost + src_cost
    unknowns_overview = _parse_json_payload(unknowns_result)

    overview_items = unknowns_overview.get("unknown_items") or []
    unknown_texts = [
        str(item.get("unknown", "")).strip()
        for item in overview_items
        if isinstance(item, dict) and str(item.get("unknown", "")).strip()
    ]
    unknowns = list(
        dict.fromkeys([*unknown_texts, *qc_unknowns, *[str(u) for u in outreach_unknowns if u]])
    )[:24]

    node_outputs["report_unknowns"] = {
        "count": len(unknowns),
        "high_impact": len(
            [item for item in overview_items if str(item.get("impact", "")).lower() == "high"]
        ),
        "categories": len(unknowns_overview.get("categories", [])),
    }

    sources_overview = _parse_json_payload(sources_result)

    overview_source_list = sources_overview.get("sources") or []
    if overview_source_list:
        sources = [
            {
                "title": str(item.get("title", ""))[:200],
                "url": str(item.get("url", ""))[:500],
                "snippet": str(item.get("snippet", ""))[:300],
            }
            for item in overview_source_list
            if isinstance(item, dict) and str(item.get("url", "")).strip()
        ]
    else:
        sources = raw_sources

    node_outputs["report_sources"] = {
        "count": len(sources),
        "types": len(sources_overview.get("source_type_mix", [])),
        "primary": sources_overview.get("summary_counts", [{}])[1].get("value")
        if sources_overview.get("summary_counts")
        else 0,
    }

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
        "target_customers_overview": target_customers_overview,
        "products": products["products"],
        "target_customers": products["target_customers"],
        "stakeholders": stakeholders,
        "stakeholders_overview": stakeholders_overview,
        "signals": signals,
        "business_signals": business_signals,
        "risks": risks,
        "risks_challenges": risks_challenges,
        "discovery_questions_overview": discovery_questions_overview,
        "discovery_questions": discovery_questions,
        "outreach_overview": outreach_overview,
        "outreach": outreach,
        "unknowns_overview": unknowns_overview,
        "unknowns": unknowns,
        "sources_overview": sources_overview,
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
            "report_target_customers",
            "report_products",
            "report_stakeholders",
            "report_stakeholders_overview",
            "report_signals_risks",
            "report_business_signals",
            "report_risks_challenges",
            "report_discovery",
            "report_discovery_overview",
            "report_outreach",
            "report_outreach_overview",
            "report_unknowns",
            "report_unknowns_overview",
            "report_sources",
            "report_sources_overview",
        ],
        "qc_unknowns_merged": len(qc_unknowns),
    }

    return report, node_outputs, total_tokens, total_cost
