import json
import re
from typing import Any


def _safe_str(value: Any, default: str = "Not available") -> str:
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return str(value)
    text = str(value).strip()
    return text or default


def _first_match(text: str, patterns: list[str]) -> str | None:
    for pattern in patterns:
        try:
            match = re.search(pattern, text, re.IGNORECASE)
        except re.error:
            continue
        if match:
            # Some patterns have no capturing group; fall back to the full match.
            value = match.group(1) if match.groups() else match.group(0)
            return value.strip()
    return None


def _firmographics_from_apollo_org(org: dict[str, Any]) -> dict[str, str]:
    employees = org.get("estimated_num_employees") or org.get("employee_count")
    if isinstance(employees, (int, float)):
        employees_str = f"{int(employees):,}+"
    else:
        employees_str = str(employees or "").strip()

    founded = org.get("founded_year")
    founded_str = str(founded) if founded else ""

    city = org.get("city") or ""
    state_region = org.get("state") or ""
    country = org.get("country") or ""
    hq_parts = [p for p in (city, state_region, country) if p]
    hq_str = ", ".join(hq_parts)

    funding = org.get("total_funding")
    stage = org.get("latest_funding_stage") or ""
    valuation_parts = []
    if funding:
        try:
            valuation_parts.append(f"${int(funding):,}")
        except (TypeError, ValueError):
            valuation_parts.append(str(funding))
    if stage:
        valuation_parts.append(str(stage))
    valuation_str = " · ".join(valuation_parts)

    revenue = org.get("annual_revenue_printed") or ""
    industry = org.get("industry") or ", ".join((org.get("industries") or [])[:2])

    return {
        "founded": founded_str,
        "hq": hq_str,
        "employees": employees_str,
        "valuation": valuation_str,
        "revenue": str(revenue),
        "industry": str(industry),
        "funding": valuation_str,
        "company_type": "Public" if org.get("publicly_traded_symbol") else "Private",
    }


def _parse_apollo_content(content: str) -> dict[str, str]:
    """Parse Apollo markdown lines when structured org is unavailable."""
    fields: dict[str, str] = {}
    patterns = {
        "employees": r"- Employees:\s*(.+)",
        "founded": r"- Founded:\s*(.+)",
        "hq": r"- HQ:\s*(.+)",
        "revenue": r"- Revenue:\s*(.+)",
        "funding": r"- Funding:\s*(.+)",
        "industry": r"- Industry:\s*(.+)",
    }
    for key, pattern in patterns.items():
        match = re.search(pattern, content, re.IGNORECASE)
        if match:
            value = match.group(1).strip()
            if value.lower() != "unknown":
                fields[key] = value
    return fields


def extract_apollo_firmographics(state: dict[str, Any]) -> dict[str, str]:
    for item in state.get("raw_research", []):
        if not isinstance(item, dict) or item.get("provider") != "apollo":
            continue
        org = item.get("organization")
        if isinstance(org, dict):
            return _firmographics_from_apollo_org(org)
        content = str(item.get("content", ""))
        if content and "Apollo company enrichment" in content:
            parsed = _parse_apollo_content(content)
            if parsed:
                return parsed
    return {}


def _pick_firmographic(*values: str | None, fallback: str = "Not confirmed") -> str:
    for raw in values:
        if raw is None:
            continue
        text = str(raw).strip()
        if text and text.lower() not in {"unknown", "not confirmed", "not available", "see research"}:
            return text
    return fallback


def extract_snapshot(state: dict[str, Any]) -> dict[str, Any]:
    analysis = state.get("business_signals") or {}
    apollo = extract_apollo_firmographics(state)
    company = _safe_str(state.get("company_name"))
    website = _safe_str(state.get("website"))
    financial = _safe_str(analysis.get("financial_signals"), "")
    competitive = _safe_str(analysis.get("competitive_landscape"), "")
    products_text = _safe_str(analysis.get("products_services"), "")

    return {
        "company_name": company,
        "website": website,
        "tagline": competitive[:120] if competitive else "Research briefing",
        "location": _pick_firmographic(
            apollo.get("hq"),
            _first_match(financial, [r"HQ[:\s]+([^.\n]+)", r"headquartered in ([^.\n]+)"]),
        ),
        "company_snapshot": {
            "industry": _pick_firmographic(
                apollo.get("industry"),
                _first_match(products_text, [r"(SaaS|FinTech|Frontend|Cloud|AI|Enterprise software)[^.\n]*"]),
                fallback="Technology",
            ),
            "founded": _pick_firmographic(
                apollo.get("founded"),
                _first_match(financial, [r"founded[^0-9]*(\d{4})", r"since (\d{4})", r"Founded:\s*(\d{4})"]),
            ),
            "hq": _pick_firmographic(
                apollo.get("hq"),
                _first_match(financial, [r"HQ[:\s]+([^.\n]+)", r"based in ([^.\n]+)", r"headquartered in ([^.\n]+)"]),
            ),
            "employees": _pick_firmographic(
                apollo.get("employees"),
                _first_match(financial, [r"(\d[\d,]+\+?)\s+employees", r"Employees:\s*([\d,]+)", r"team of (\d[\d,]+)"]),
            ),
            "status": _pick_firmographic(
                apollo.get("company_type"),
                _first_match(financial, [r"(Private|Public)", r"(Series [A-F])"]),
                fallback="Private",
            ),
            "valuation": _pick_firmographic(
                apollo.get("valuation"),
                apollo.get("funding"),
                _first_match(financial, [r"\$[\d.]+[BMK] valuation", r"valued at \$[\d.]+[BMK]"]),
            ),
            "funding_round": _pick_firmographic(
                _first_match(financial, [r"(Series [A-F][^.\n]*)"]),
                apollo.get("funding"),
                fallback="",
            ),
            "open_roles": _first_match(financial, [r"(\d+)\s+open roles?", r"hiring (\d+)"]) or "",
        },
        "commercial_profile": {
            "arr": _pick_firmographic(
                apollo.get("revenue"),
                _first_match(financial, [r"ARR[^$]*(\$[\d.]+[BMK])", r"~\$[\d.]+[BMK] ARR", r"Revenue:\s*(\$[^\n]+)"]),
            ),
            "arr_growth": _first_match(financial, [r"(\+\d+%\s*YoY)", r"growth of (\d+%)"]) or "",
            "developers": _first_match(financial, [r"(\d[\d,]+[MK]?\+?)\s+developers"]) or "",
            "model": _first_match(
                products_text,
                [r"(SaaS \+ usage[^.\n]*)", r"(subscription[^.\n]*)"],
            )
            or "SaaS",
            "enterprise_min_contract": _first_match(financial, [r"\$[\d,]+[–-]\$?[\d,]+/yr", r"\$[\d,]+/yr"]) or "",
            "total_raised": _pick_firmographic(
                apollo.get("funding"),
                _first_match(financial, [r"raised \$[\d.]+[BMK]", r"\$[\d.]+[BMK] raised", r"Funding:\s*([^\n]+)"]),
            ),
            "cash": _first_match(financial, [r"\$[\d.]+[BMK]\+?\s+cash", r"cash[^$]*(\$[\d.]+[BMK])"]) or "",
            "customers": _first_match(financial, [r"(\d[\d,]+[MK]?\+?\s+customers)"]) or "",
            "hiring": _first_match(financial, [r"(\d+\s+open roles?)"]) or "",
            "geographic_presence": _first_match(financial, [r"(\d+\+?\s+countries)"]) or "",
        },
    }


def firmographics_prompt_block(state: dict[str, Any]) -> str:
    """Apollo + snapshot firmographics for LLM prompts."""
    apollo = extract_apollo_firmographics(state)
    if not apollo:
        return ""
    lines = [f"- {key.replace('_', ' ').title()}: {value}" for key, value in apollo.items() if value]
    return "Verified firmographics:\n" + "\n".join(lines)


_PRODUCT_KEYWORDS = (
    "product",
    "products",
    "solution",
    "solutions",
    "platform",
    "pricing",
    "features",
    "docs",
    "documentation",
    "developers",
    "api",
    "integrations",
    "services",
    "offerings",
    "/docs",
    "/product",
    "/solutions",
    "/pricing",
)


def extract_product_page_research(state: dict[str, Any], max_chars: int = 12000) -> str:
    """Collect product/solution page content from analysis and raw research (incl. Firecrawl scrapes)."""
    parts: list[str] = []
    analysis = state.get("business_signals") or {}
    products_text = _safe_str(analysis.get("products_services"), "")
    if products_text and products_text != "Not available":
        parts.append(f"Analysis products_services:\n{products_text[:4000]}")

    for item in state.get("raw_research", []):
        if not isinstance(item, dict):
            continue
        query = _safe_str(item.get("query"), "")
        content = _safe_str(item.get("content"), "")
        provider = _safe_str(item.get("provider"), "")
        if not content or content.startswith("firecrawl request failed"):
            continue

        source_urls = " ".join(str(src.get("url", "")) for src in item.get("sources", []) if isinstance(src, dict))
        combined = f"{query} {source_urls} {content[:300]}".lower()
        is_product_related = any(keyword in combined for keyword in _PRODUCT_KEYWORDS)
        if is_product_related or provider == "firecrawl":
            label = query or source_urls[:120] or provider
            parts.append(f"\n--- {provider}: {label} ---\n{content[:5000]}")

    return "\n".join(parts)[:max_chars]


def extract_products(state: dict[str, Any]) -> dict[str, Any]:
    analysis = state.get("business_signals") or {}
    products_text = _safe_str(analysis.get("products_services"))
    customers_text = _safe_str(analysis.get("target_customers"))

    products: list[dict[str, str]] = []
    for line in products_text.split("\n"):
        line = line.strip(" -•")
        if len(line) > 20:
            products.append({"name": line[:80], "type": "Product", "description": line, "tag": ""})
    if not products and products_text:
        products.append({"name": "Core offering", "type": "Product", "description": products_text, "tag": ""})

    segments: list[dict[str, Any]] = []
    for line in customers_text.split("\n"):
        line = line.strip(" -•")
        if len(line) > 10:
            segments.append({"segment": line[:60], "detail": line, "named_customers": []})
    if not segments and customers_text:
        segments.append({"segment": "Primary ICP", "detail": customers_text, "named_customers": []})

    return {"products": products[:6], "target_customers": segments[:6]}


def extract_sources(state: dict[str, Any]) -> list[dict[str, str]]:
    seen: set[str] = set()
    sources: list[dict[str, str]] = []
    for item in state.get("raw_research", []):
        for src in item.get("sources", []):
            url = str(src.get("url", "")).strip()
            if not url or url in seen:
                continue
            seen.add(url)
            sources.append(
                {
                    "title": str(src.get("title", url))[:200],
                    "url": url,
                    "snippet": str(src.get("snippet", ""))[:300],
                }
            )
            if len(sources) >= 20:
                return sources
    return sources


def signals_from_analysis(analysis: dict[str, Any]) -> list[dict[str, str]]:
    raw = analysis.get("business_signals") or []
    if not isinstance(raw, list):
        return []
    signals: list[dict[str, str]] = []
    for item in raw[:6]:
        if not isinstance(item, dict):
            continue
        signals.append(
            {
                "type": _safe_str(item.get("signal_type"), "Other"),
                "date": "Recent",
                "text": _safe_str(item.get("signal") or item.get("evidence")),
                "sales_angle": _safe_str(item.get("relevance"), "Relevant for discovery"),
            }
        )
    return signals


def risks_from_analysis(analysis: dict[str, Any]) -> list[dict[str, Any]]:
    raw = analysis.get("risks_challenges") or []
    if not isinstance(raw, list):
        return []
    risks: list[dict[str, Any]] = []
    for item in raw[:4]:
        if not isinstance(item, dict):
            continue
        risks.append(
            {
                "title": _safe_str(item.get("risk"), "Risk"),
                "category": _safe_str(item.get("risk_category"), "Other"),
                "severity": int(item.get("severity") or 3),
                "body": _safe_str(item.get("evidence")),
                "source": "Research analysis",
            }
        )
    return risks


_STAKEHOLDER_KEYWORDS = ("about", "team", "leadership", "executive", "board", "founder", "management", "people")


def extract_stakeholder_research(state: dict[str, Any], max_chars: int = 10000) -> str:
    """Collect leadership/team page content and people data from research."""
    parts: list[str] = []
    analysis = state.get("business_signals") or {}
    people = analysis.get("key_people") or []
    if people:
        parts.append(f"Analysis key_people:\n{json.dumps(people, indent=2)[:4000]}")

    for item in state.get("raw_research", []):
        if not isinstance(item, dict):
            continue
        content = _safe_str(item.get("content"), "")
        provider = _safe_str(item.get("provider"), "")
        if not content:
            continue

        apollo_people = item.get("people")
        if isinstance(apollo_people, list) and apollo_people:
            parts.append(f"\n--- {provider} people ---\n{json.dumps(apollo_people, indent=2)[:3000]}")

        source_urls = " ".join(str(src.get("url", "")) for src in item.get("sources", []) if isinstance(src, dict))
        combined = f"{source_urls} {content[:300]}".lower()
        if provider == "apollo" or any(keyword in combined for keyword in _STAKEHOLDER_KEYWORDS):
            label = source_urls[:120] or provider
            parts.append(f"\n--- {provider}: {label} ---\n{content[:5000]}")

    return "\n".join(parts)[:max_chars]


def stakeholders_from_analysis(analysis: dict[str, Any]) -> list[dict[str, str]]:
    raw = analysis.get("key_people") or []
    if not isinstance(raw, list):
        return []
    people: list[dict[str, str]] = []
    for item in raw[:5]:
        if isinstance(item, dict):
            people.append(
                {
                    "name": _safe_str(item.get("name")),
                    "title": _safe_str(item.get("title"), "Executive"),
                    "tenure": _safe_str(item.get("tenure"), ""),
                    "previous_company": _safe_str(item.get("previous_company"), ""),
                    "linkedin_url": _safe_str(item.get("linkedin_url"), ""),
                    "why_matters": _safe_str(item.get("why_matters") or item.get("role"), "Key decision maker"),
                    "conversation_hook": _safe_str(
                        item.get("conversation_hook") or item.get("hook"), "Reference recent company news"
                    ),
                }
            )
        elif isinstance(item, str):
            people.append(
                {
                    "name": item,
                    "title": "Executive",
                    "tenure": "",
                    "previous_company": "",
                    "linkedin_url": "",
                    "why_matters": "Mentioned in research",
                    "conversation_hook": "Ask about their priorities this quarter",
                }
            )
    return people


def structured_to_legacy(structured: dict[str, Any]) -> dict[str, Any]:
    snap = structured.get("company_snapshot") or {}
    commercial = structured.get("commercial_profile") or {}

    overview_lines = [
        f"**Industry:** {snap.get('industry', '')}",
        f"**Founded:** {snap.get('founded', '')}",
        f"**HQ:** {snap.get('hq', '')}",
        f"**Employees:** {snap.get('employees', '')}",
        f"**Status:** {snap.get('status', '')}",
        f"**Valuation:** {snap.get('valuation', '')}",
    ]
    commercial_lines = [f"**{k.replace('_', ' ').title()}:** {v}" for k, v in commercial.items() if v]

    products_md = "\n".join(
        f"- **{p.get('name')}** ({p.get('type', '')}): {p.get('description', '')}"
        for p in structured.get("products", [])
    )
    customers_md = "\n".join(
        f"- **{c.get('segment')}:** {c.get('detail', '')}" for c in structured.get("target_customers", [])
    )
    signals_md = "\n".join(
        f"- **{s.get('type')}** ({s.get('date')}): {s.get('text', '')}\n  _Angle: {s.get('sales_angle', '')}_"
        for s in structured.get("signals", [])
    )
    risks_md = "\n".join(
        f"- **{r.get('title')}** (severity {r.get('severity')}): {r.get('body', '')}"
        for r in structured.get("risks", [])
    )

    outreach = structured.get("outreach") or {}
    outreach_lines = [
        f"**Channel:** {outreach.get('channel', '')}",
        f"**Primary contact:** {outreach.get('primary_contact', '')}",
        f"**Hook:** {outreach.get('hook', '')}",
    ]
    for step in outreach.get("sequence", []):
        outreach_lines.append(f"- **Day {step.get('day')}:** {step.get('action', '')}")

    discovery = structured.get("discovery_questions") or []
    discovery_list = [
        q.get("question", "") if isinstance(q, dict) else str(q) for q in discovery
    ]

    return {
        "company_overview": "\n".join(overview_lines) + "\n\n" + "\n".join(commercial_lines),
        "products_services": products_md,
        "target_customers": customers_md,
        "business_signals": signals_md,
        "risks_challenges": risks_md,
        "discovery_questions": discovery_list,
        "outreach_strategy": "\n\n".join(outreach_lines),
        "unknowns": structured.get("unknowns") or [],
        "sources": structured.get("sources") or [],
        "structured": structured,
    }
