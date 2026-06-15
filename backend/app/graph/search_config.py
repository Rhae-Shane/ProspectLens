from typing import Any


def _clamp_int(value: Any, default: int, minimum: int, maximum: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default
    return max(minimum, min(maximum, parsed))


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
    }
