from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from app.config import get_settings

settings = get_settings()


class NewsApiClient:
    """NewsAPI.org client for recent company news articles."""

    BASE_URL = "https://newsapi.org/v2/everything"

    def __init__(self) -> None:
        self.api_key = settings.newapiorg_api_key

    async def search_company_news(
        self,
        company: str,
        context: str = "",
        *,
        days_back: int = 30,
        max_results: int = 5,
    ) -> tuple[dict[str, Any], int, float]:
        if not self.api_key:
            return self._mock_search(company)

        from_date = (datetime.now(timezone.utc) - timedelta(days=days_back)).strftime("%Y-%m-%d")
        query = f'"{company}"'

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(
                self.BASE_URL,
                params={
                    "q": query,
                    "from": from_date,
                    "language": "en",
                    "sort_by": "publishedAt",
                    "pageSize": max_results,
                    "apiKey": self.api_key,
                },
            )
            response.raise_for_status()
            data = response.json()

        if data.get("status") != "ok":
            message = data.get("message", "Unknown NewsAPI error")
            return (
                {
                    "query": f"{company} recent news",
                    "provider": "newsapi",
                    "content": f"NewsAPI request failed: {message}",
                    "sources": [],
                },
                0,
                0.0,
            )

        articles = data.get("articles", [])
        sources: list[dict[str, str]] = []
        lines: list[str] = []

        for article in articles:
            title = article.get("title") or "Untitled"
            url = article.get("url") or ""
            source_name = (article.get("source") or {}).get("name", "")
            published = (article.get("publishedAt") or "")[:10]
            description = article.get("description") or article.get("content") or ""
            snippet = description[:300] if description else ""

            sources.append({"title": title, "url": url, "snippet": snippet})
            meta = f" ({source_name}, {published})" if source_name or published else ""
            lines.append(f"- {title}{meta}: {snippet}".strip())

        if lines:
            content = f"Recent news for {company} (last {days_back} days):\n" + "\n".join(lines)
        else:
            content = f"No recent news articles found for {company} in the last {days_back} days."

        result = {
            "query": f"{company} recent news",
            "provider": "newsapi",
            "content": content,
            "sources": sources,
        }
        tokens = max(len(content) // 4, 50)
        return result, tokens, 0.0

    def _mock_search(self, company: str) -> tuple[dict[str, Any], int, float]:
        return (
            {
                "query": f"{company} recent news",
                "provider": "newsapi",
                "content": (
                    f"NewsAPI placeholder for {company}. "
                    "Configure NEWAPIORG_API_KEY for live company news."
                ),
                "sources": [],
            },
            50,
            0.0,
        )


newsapi_client = NewsApiClient()
