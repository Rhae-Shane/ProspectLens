from typing import Any

SECTION_UNKNOWN_LABELS: dict[str, str] = {
    "company_overview": "Company overview is thin — confirm size, model, and positioning in the meeting",
    "products_services": "Product and service details are unclear — validate offerings and packaging",
    "target_customers": "Target customer profile not well verified — confirm ICP and buyer persona",
    "business_signals": "Few concrete business signals found — probe for recent initiatives and triggers",
    "risks_challenges": "Limited risk intelligence — explore operational and competitive pressures directly",
    "discovery_questions": "Research too shallow for sharp discovery — rely on open-ended qualification",
    "outreach_strategy": "Weak hooks for outreach — personalize using live LinkedIn/news before contacting",
    "unknowns": "Multiple gaps remain — treat this briefing as directional, not definitive",
    "sources": "Few citable sources — verify claims before using them in customer-facing material",
}


def unknowns_from_coverage(
    section_coverage: dict[str, Any],
    *,
    threshold: float = 0.6,
) -> list[str]:
    unknowns: list[str] = []
    for section, raw_score in section_coverage.items():
        try:
            score = float(raw_score)
        except (TypeError, ValueError):
            continue
        if score >= threshold:
            continue
        label = SECTION_UNKNOWN_LABELS.get(section)
        if label and label not in unknowns:
            unknowns.append(label)
    return unknowns
