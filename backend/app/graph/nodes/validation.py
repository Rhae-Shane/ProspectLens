from typing import Any, Callable

# Each check: section key -> (label, predicate over structured report, gap unknown text)
_SECTION_CHECKS: dict[str, tuple[str, Callable[[dict[str, Any]], bool], str]] = {
    "company_overview": (
        "Company Overview",
        lambda s: len((s.get("company_overview") or {}).get("key_metrics") or []) >= 3,
        "Company overview metrics are incomplete — confirm size, revenue, and positioning live",
    ),
    "products_services": (
        "Products & Services",
        lambda s: len((s.get("products_services") or {}).get("core_products") or []) >= 1
        or len(s.get("products") or []) >= 1,
        "Product portfolio is thin — validate the core offerings during the call",
    ),
    "target_customers": (
        "Target Customers",
        lambda s: len((s.get("target_customers_overview") or {}).get("segments") or []) >= 1
        or len(s.get("target_customers") or []) >= 1,
        "Customer segments not well established — confirm ICP and named accounts",
    ),
    "stakeholders": (
        "Stakeholders",
        lambda s: len((s.get("stakeholders_overview") or {}).get("executives") or []) >= 1
        or len(s.get("stakeholders") or []) >= 1,
        "Key stakeholders unverified — identify decision makers before outreach",
    ),
    "business_signals": (
        "Business Signals",
        lambda s: len((s.get("business_signals") or {}).get("key_signals") or []) >= 1
        or len(s.get("signals") or []) >= 1,
        "Few business signals detected — probe for recent initiatives and triggers",
    ),
    "risks_challenges": (
        "Risks & Challenges",
        lambda s: len((s.get("risks_challenges") or {}).get("top_risks") or []) >= 1
        or len(s.get("risks") or []) >= 1,
        "Limited risk intelligence — explore operational and competitive pressures directly",
    ),
    "discovery_questions": (
        "Discovery Questions",
        lambda s: len((s.get("discovery_questions_overview") or {}).get("questions") or []) >= 1
        or len(s.get("discovery_questions") or []) >= 1,
        "Discovery questions are sparse — rely on open-ended qualification",
    ),
    "outreach_strategy": (
        "Outreach Strategy",
        lambda s: len((s.get("outreach_overview") or {}).get("strategies") or []) >= 1,
        "Outreach plan is weak — personalize using live LinkedIn/news before contacting",
    ),
    "sources": (
        "Sources",
        lambda s: len((s.get("sources_overview") or {}).get("sources") or []) >= 1
        or len(s.get("sources") or []) >= 1,
        "Few citable sources — verify claims before using them with the customer",
    ),
}


async def report_validation_node(state: dict[str, Any]) -> dict[str, Any]:
    """Deterministic gate that runs after report generation.

    Verifies each dashboard has its minimum required content, records a
    validation summary, and folds any missing-section warnings into the
    report's unknowns so the briefing stays honest about gaps.
    """
    report = dict(state.get("report") or {})
    structured = report.get("structured") or {}

    sections: dict[str, dict[str, Any]] = {}
    gap_unknowns: list[str] = []
    passed = 0
    for key, (label, predicate, gap_text) in _SECTION_CHECKS.items():
        try:
            ok = bool(predicate(structured))
        except Exception:
            ok = False
        sections[key] = {"label": label, "ok": ok}
        if ok:
            passed += 1
        else:
            gap_unknowns.append(gap_text)

    total = len(_SECTION_CHECKS)
    validation = {
        "sections": sections,
        "passed": passed,
        "total": total,
        "score": round(passed / total, 3) if total else 0.0,
        "incomplete_sections": [k for k, v in sections.items() if not v["ok"]],
    }

    # Fold gap warnings into the report's unknowns (deduped, capped).
    if gap_unknowns and structured:
        existing = list(structured.get("unknowns") or [])
        merged = list(dict.fromkeys([*existing, *gap_unknowns]))[:30]
        structured["unknowns"] = merged
        report["structured"] = structured
        if isinstance(report.get("unknowns"), list):
            report["unknowns"] = list(dict.fromkeys([*report["unknowns"], *gap_unknowns]))[:30]

    node_outputs = dict(state.get("node_outputs", {}))
    node_outputs["report_validation"] = validation

    return {
        "report": report,
        "report_validation": validation,
        "node_outputs": node_outputs,
    }
