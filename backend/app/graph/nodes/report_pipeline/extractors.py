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
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    return None


def extract_snapshot(state: dict[str, Any]) -> dict[str, Any]:
    analysis = state.get("business_signals") or {}
    company = _safe_str(state.get("company_name"))
    website = _safe_str(state.get("website"))
    financial = _safe_str(analysis.get("financial_signals"), "")
    competitive = _safe_str(analysis.get("competitive_landscape"), "")

    return {
        "company_name": company,
        "website": website,
        "tagline": competitive[:120] if competitive else "Research briefing",
        "location": _first_match(financial, [r"HQ[:\s]+([^.\n]+)", r"headquartered in ([^.\n]+)"]) or "See research",
        "company_snapshot": {
            "industry": _first_match(
                _safe_str(analysis.get("products_services")),
                [r"(SaaS|FinTech|Frontend|Cloud|AI|Enterprise software)[^.\n]*"],
            )
            or "Technology",
            "founded": _first_match(financial, [r"founded[^0-9]*(\d{4})", r"since (\d{4})"]) or "Not confirmed",
            "hq": _first_match(financial, [r"HQ[:\s]+([^.\n]+)", r"based in ([^.\n]+)"]) or "Not confirmed",
            "employees": _first_match(financial, [r"(\d[\d,]+\+?)\s+employees", r"team of (\d[\d,]+)"])
            or "Not confirmed",
            "status": _first_match(financial, [r"(Private|Public)", r"(Series [A-F])"]) or "Private",
            "valuation": _first_match(financial, [r"\$[\d.]+[BMK] valuation", r"valued at \$[\d.]+[BMK]"])
            or "Not confirmed",
            "funding_round": _first_match(financial, [r"(Series [A-F][^.\n]*)"]) or "",
            "open_roles": _first_match(financial, [r"(\d+)\s+open roles?", r"hiring (\d+)"]) or "",
        },
        "commercial_profile": {
            "arr": _first_match(financial, [r"ARR[^$]*(\$[\d.]+[BMK])", r"~\$[\d.]+[BMK] ARR"]) or "Not confirmed",
            "arr_growth": _first_match(financial, [r"(\+\d+%\s*YoY)", r"growth of (\d+%)"]) or "",
            "developers": _first_match(financial, [r"(\d[\d,]+[MK]?\+?)\s+developers"]) or "",
            "model": _first_match(
                _safe_str(analysis.get("products_services")),
                [r"(SaaS \+ usage[^.\n]*)", r"(subscription[^.\n]*)"],
            )
            or "SaaS",
            "enterprise_min_contract": _first_match(financial, [r"\$[\d,]+[–-]\$?[\d,]+/yr", r"\$[\d,]+/yr"]) or "",
            "total_raised": _first_match(financial, [r"raised \$[\d.]+[BMK]", r"\$[\d.]+[BMK] raised"]) or "",
            "cash": _first_match(financial, [r"\$[\d.]+[BMK]\+?\s+cash", r"cash[^$]*(\$[\d.]+[BMK])"]) or "",
            "customers": _first_match(financial, [r"(\d[\d,]+[MK]?\+?\s+customers)"]) or "",
            "hiring": _first_match(financial, [r"(\d+\s+open roles?)"]) or "",
            "geographic_presence": _first_match(financial, [r"(\d+\+?\s+countries)"]) or "",
        },
    }


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
