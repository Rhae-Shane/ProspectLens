from typing import Any

import httpx

from app.config import get_settings

settings = get_settings()


class TavilyClient:
    """Tavily web search API client for research with citations."""

    BASE_URL = "https://api.tavily.com/search"
    COST_PER_SEARCH = 0.001  # approximate for basic depth

    def __init__(self) -> None:
        self.api_key = settings.tavily_api_key

    async def search(
        self,
        query: str,
        context: str = "",
        *,
        search_depth: str = "basic",
        max_results: int = 5,
    ) -> tuple[dict[str, Any], int, float]:
        if not self.api_key:
            return self._mock_search(query, context)

        company = self._company_from_context(context)
        search_query = f"{company}: {query}" if company else query

        payload: dict[str, Any] = {
            "query": search_query[:4000],
            "search_depth": search_depth,
            "max_results": max_results,
            "include_answer": True,
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                self.BASE_URL,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        answer = data.get("answer", "")
        results = data.get("results", [])

        sources = []
        snippets: list[str] = []
        for item in results:
            title = item.get("title", "Source")
            url = item.get("url", "")
            snippet = item.get("content", "")
            sources.append({"title": title, "url": url, "snippet": snippet})
            if snippet:
                snippets.append(f"- {title}: {snippet}")

        content = answer or "\n".join(snippets) or "No results returned from Tavily."

        result = {
            "query": query,
            "provider": "tavily",
            "content": content,
            "sources": sources,
        }
        tokens = max(len(content) // 4, 100)
        return result, tokens, self.COST_PER_SEARCH

    @staticmethod
    def _company_from_context(context: str) -> str | None:
        for line in context.splitlines():
            if line.lower().startswith("company:"):
                value = line.split(":", 1)[1].strip()
                return value or None
        return None

    def _mock_search(self, query: str, context: str) -> tuple[dict[str, Any], int, float]:
        company = context.split("Company:")[-1].split("\n")[0].strip() if "Company:" in context else "the company"
        return {
            "query": query,
            "provider": "tavily",
            "content": (
                f"Tavily search placeholder for {company}: {query}. "
                "Configure TAVILY_API_KEY for live web search."
            ),
            "sources": [],
        }, 100, 0.0


tavily_client = TavilyClient()
