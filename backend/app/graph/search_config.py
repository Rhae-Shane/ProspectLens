from typing import Any


def _clamp_int(value: Any, default: int, minimum: int, maximum: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default
    return max(minimum, min(maximum, parsed))


def _as_bool(value: Any, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    if value is None:
        return default
    return bool(value)


def parse_search_config(plan: dict[str, Any]) -> dict[str, Any]:
    """Read agent-chosen search parameters from the research plan."""
    raw = plan.get("search_config") or {}

    depth = str(raw.get("tavily_search_depth", "basic")).lower()
    if depth not in {"basic", "advanced", "fast"}:
        depth = "basic"

    return {
        "tavily_search_depth": depth,
        "tavily_max_results": _clamp_int(raw.get("tavily_max_results"), default=5, minimum=3, maximum=10),
        "news_days_back": _clamp_int(raw.get("news_days_back"), default=30, minimum=7, maximum=90),
        "news_max_results": _clamp_int(raw.get("news_max_results"), default=5, minimum=3, maximum=15),
        "firecrawl_map_limit": _clamp_int(raw.get("firecrawl_map_limit"), default=10, minimum=5, maximum=25),
        "firecrawl_scrape_extra_pages": _clamp_int(
            raw.get("firecrawl_scrape_extra_pages"), default=2, minimum=0, maximum=5
        ),
        "firecrawl_use_search": _as_bool(raw.get("firecrawl_use_search"), default=False),
        "firecrawl_use_crawl": _as_bool(raw.get("firecrawl_use_crawl"), default=False),
        "firecrawl_search_limit": _clamp_int(raw.get("firecrawl_search_limit"), default=5, minimum=3, maximum=10),
        "firecrawl_crawl_limit": _clamp_int(raw.get("firecrawl_crawl_limit"), default=5, minimum=2, maximum=10),
    }
