from typing import Any


def build_targeted_intel_queries(company: str, search_config: dict[str, Any]) -> list[str]:
    """Build Tavily-only targeted queries for sentiment, reviews, and hiring."""
    queries: list[str] = []

    if search_config.get("intel_reddit_search", True):
        queries.append(f'site:reddit.com "{company}" problems OR review OR alternative')

    if search_config.get("intel_g2_search", True):
        queries.append(f'site:g2.com "{company}" reviews')

    if search_config.get("intel_hiring_search", True):
        queries.append(f'"{company}" hiring careers open roles')

    if search_config.get("intel_sentiment_search", True):
        queries.append(f'"{company}" customer complaints OR praise OR sentiment')

    return queries
