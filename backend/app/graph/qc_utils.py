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

REQUIRED_SECTIONS: tuple[str, ...] = (
    "company_overview",
    "products_services",
    "target_customers",
    "business_signals",
    "risks_challenges",
    "discovery_questions",
    "outreach_strategy",
    "unknowns",
    "sources",
)

# Markers that indicate a provider call failed rather than returning real content.
_FAILURE_MARKERS: tuple[str, ...] = (
    "search failed",
    "request failed",
    "pipeline failed",
    "lookup failed",
    "enrichment failed",
    "configure firecrawl",
    "configure tavily",
    "configure perplexity",
    "configure apollo",
    "configure newsapi",
)


def _content_is_failure(content: str) -> bool:
    lowered = content.strip().lower()
    if not lowered:
        return True
    return any(marker in lowered for marker in _FAILURE_MARKERS)


def sanitize_research(
    raw_research: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """Drop failed/empty provider results so analysis and QC use real data only.

    Items are kept when they carry usable content OR at least one source, so a
    failed-text item that still returned links is preserved. Returns the cleaned
    list plus stats used by deterministic quality scoring.
    """
    clean: list[dict[str, Any]] = []
    failed = 0
    seen_urls: set[str] = set()
    for item in raw_research:
        if not isinstance(item, dict):
            continue
        content = str(item.get("content", ""))
        sources = item.get("sources") or []
        usable_sources = [s for s in sources if isinstance(s, dict) and s.get("url")]
        if _content_is_failure(content) and not usable_sources:
            failed += 1
            continue
        clean.append(item)
        for source in usable_sources:
            url = str(source.get("url", "")).strip().lower()
            if url:
                seen_urls.add(url)

    stats = {
        "input_items": len(raw_research),
        "clean_items": len(clean),
        "failed_items": failed,
        "unique_sources": len(seen_urls),
    }
    return clean, stats


def count_unique_sources(raw_research: list[dict[str, Any]]) -> int:
    seen: set[str] = set()
    for item in raw_research:
        if not isinstance(item, dict):
            continue
        for source in item.get("sources") or []:
            if isinstance(source, dict):
                url = str(source.get("url", "")).strip().lower()
                if url:
                    seen.add(url)
    return len(seen)


def _list_len(value: Any) -> int:
    return len(value) if isinstance(value, list) else 0


def _text_len(value: Any) -> int:
    return len(str(value).strip()) if value else 0


def deterministic_section_coverage(
    analysis: dict[str, Any],
    clean_research: list[dict[str, Any]],
    unique_sources: int,
) -> dict[str, float]:
    """Heuristic, data-grounded coverage per section (0.0-1.0).

    This complements the LLM score so QC reflects what was actually found,
    not just the model's subjective read of the research text.
    """
    research_volume = sum(len(str(item.get("content", ""))) for item in clean_research)
    named_customers = analysis.get("named_customers") or []
    key_people = analysis.get("key_people") or []
    signals = analysis.get("business_signals") or []
    risks = analysis.get("risks_challenges") or []

    def scale(value: float, full_at: float) -> float:
        if full_at <= 0:
            return 0.0
        return max(0.0, min(1.0, value / full_at))

    return {
        "company_overview": scale(research_volume, 6000),
        "products_services": max(
            scale(_text_len(analysis.get("products_services")), 400),
            scale(research_volume, 8000),
        ),
        "target_customers": max(
            scale(_text_len(analysis.get("target_customers")), 300),
            scale(_list_len(named_customers), 3),
        ),
        "business_signals": scale(_list_len(signals), 4),
        "risks_challenges": scale(_list_len(risks), 3),
        "discovery_questions": scale(research_volume, 8000),
        "outreach_strategy": max(
            scale(_list_len(key_people), 2),
            scale(_text_len(analysis.get("competitive_landscape")), 200),
        ),
        "unknowns": 1.0,
        "sources": scale(unique_sources, 5),
    }


def blend_coverage(
    llm_coverage: dict[str, Any],
    deterministic: dict[str, float],
    *,
    llm_weight: float = 0.5,
) -> dict[str, float]:
    """Blend the LLM's coverage read with deterministic evidence per section."""
    blended: dict[str, float] = {}
    for section in REQUIRED_SECTIONS:
        det = float(deterministic.get(section, 0.0))
        raw_llm = llm_coverage.get(section)
        try:
            llm = float(raw_llm)
        except (TypeError, ValueError):
            blended[section] = det
            continue
        blended[section] = round(llm_weight * llm + (1.0 - llm_weight) * det, 3)
    return blended


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


# Section -> targeted recovery queries used when coverage is weak. Keeps retries
# cheap and focused instead of re-running the entire research plan.
_SECTION_RECOVERY_QUERIES: dict[str, tuple[str, ...]] = {
    "company_overview": ("{company} company overview business model revenue employees headquarters",),
    "products_services": ("{company} products services pricing features product line",),
    "target_customers": ("{company} customers case studies target market ICP industries served",),
    "business_signals": ("{company} recent news funding hiring product launch partnership expansion",),
    "risks_challenges": ("{company} risks challenges competition lawsuits regulatory issues",),
    "discovery_questions": ("{company} strategy priorities roadmap initiatives goals",),
    "outreach_strategy": ("{company} leadership executives team key decision makers",),
    "sources": ("{company} official website press releases annual report news coverage",),
}


def recovery_queries_for_sections(
    company: str,
    section_coverage: dict[str, Any],
    *,
    threshold: float = 0.6,
    limit: int = 4,
) -> list[str]:
    """Build focused queries for the weakest sections (lowest coverage first)."""
    scored: list[tuple[float, str]] = []
    for section, raw_score in section_coverage.items():
        if section not in _SECTION_RECOVERY_QUERIES:
            continue
        try:
            score = float(raw_score)
        except (TypeError, ValueError):
            score = 0.0
        if score < threshold:
            scored.append((score, section))

    scored.sort(key=lambda pair: pair[0])
    queries: list[str] = []
    for _, section in scored:
        for template in _SECTION_RECOVERY_QUERIES[section]:
            query = template.format(company=company)
            if query not in queries:
                queries.append(query)
        if len(queries) >= limit:
            break
    return queries[:limit]
