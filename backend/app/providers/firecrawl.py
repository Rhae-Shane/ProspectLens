import asyncio
from typing import Any
from urllib.parse import urlparse

import httpx

from app.config import get_settings

settings = get_settings()


def normalize_url(url: str) -> str:
    cleaned = url.strip()
    if not cleaned:
        return cleaned
    if not cleaned.startswith(("http://", "https://")):
        return f"https://{cleaned}"
    return cleaned


def _estimate_tokens(text: str) -> int:
    return max(len(text) // 4, 50)


class FirecrawlClient:
    """Firecrawl API client for scraping and mapping company websites."""

    BASE_URL = "https://api.firecrawl.dev/v2"
    COST_PER_SCRAPE = 0.002
    COST_PER_MAP = 0.001
    COST_PER_SEARCH = 0.002
    COST_PER_CRAWL_PAGE = 0.002

    def __init__(self) -> None:
        self.api_key = settings.firecrawl_api_key

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    async def scrape(self, url: str) -> tuple[dict[str, Any], int, float]:
        if not self.api_key:
            return self._mock_result("scrape", url, "Configure FIRECRAWL_API_KEY for live scraping.")

        target = normalize_url(url)
        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.post(
                f"{self.BASE_URL}/scrape",
                headers=self._headers(),
                json={"url": target, "formats": ["markdown"]},
            )
            response.raise_for_status()
            data = response.json()

        if not data.get("success"):
            message = data.get("error", "Firecrawl scrape failed")
            return self._error_result("scrape", target, message)

        markdown = data.get("data", {}).get("markdown", "") or ""
        metadata = data.get("data", {}).get("metadata", {}) or {}
        title = metadata.get("title") or target
        content = markdown[:12000] if markdown else "No content extracted."

        return (
            {
                "query": f"scrape {target}",
                "provider": "firecrawl",
                "content": content,
                "sources": [{"title": title, "url": target, "snippet": content[:300]}],
            },
            _estimate_tokens(content),
            self.COST_PER_SCRAPE,
        )

    async def map_site(self, url: str, *, limit: int = 10) -> tuple[dict[str, Any], int, float]:
        if not self.api_key:
            return self._mock_result("map", url, "Configure FIRECRAWL_API_KEY for site mapping.")

        target = normalize_url(url)
        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.post(
                f"{self.BASE_URL}/map",
                headers=self._headers(),
                json={"url": target, "limit": limit},
            )
            response.raise_for_status()
            data = response.json()

        if not data.get("success"):
            message = data.get("error", "Firecrawl map failed")
            return self._error_result("map", target, message)

        links = data.get("links", []) or data.get("data", {}).get("links", []) or []
        sources: list[dict[str, str]] = []
        lines: list[str] = []

        for link in links:
            if isinstance(link, str):
                link_url, title = link, link
            else:
                link_url = link.get("url", "")
                title = link.get("title") or link_url
            if not link_url:
                continue
            sources.append({"title": title, "url": link_url, "snippet": ""})
            lines.append(f"- {title}: {link_url}")

        content = (
            f"Discovered {len(sources)} pages on {target}:\n" + "\n".join(lines)
            if lines
            else f"No additional pages discovered for {target}."
        )

        return (
            {
                "query": f"map {target}",
                "provider": "firecrawl",
                "content": content,
                "sources": sources,
            },
            _estimate_tokens(content),
            self.COST_PER_MAP,
        )

    async def search(self, query: str, *, limit: int = 5) -> tuple[dict[str, Any], int, float]:
        if not self.api_key:
            return self._mock_result("search", query, "Configure FIRECRAWL_API_KEY for live search.")

        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.post(
                f"{self.BASE_URL}/search",
                headers=self._headers(),
                json={"query": query, "limit": limit},
            )
            response.raise_for_status()
            data = response.json()

        if not data.get("success"):
            message = data.get("error", "Firecrawl search failed")
            return self._error_result("search", query, message)

        results = data.get("data", {}).get("web", []) or data.get("data", []) or []
        sources: list[dict[str, str]] = []
        lines: list[str] = []

        for item in results:
            title = item.get("title") or item.get("url") or "Result"
            link_url = item.get("url", "")
            snippet = item.get("description") or item.get("markdown", "") or ""
            snippet = snippet[:300]
            sources.append({"title": title, "url": link_url, "snippet": snippet})
            lines.append(f"- {title}: {snippet}".strip())

        content = f"Firecrawl search results for \"{query}\":\n" + "\n".join(lines) if lines else f"No search results for \"{query}\"."

        return (
            {
                "query": query,
                "provider": "firecrawl",
                "content": content,
                "sources": sources,
            },
            _estimate_tokens(content),
            self.COST_PER_SEARCH,
        )

    async def crawl(self, url: str, *, limit: int = 5) -> tuple[dict[str, Any], int, float]:
        if not self.api_key:
            return self._mock_result("crawl", url, "Configure FIRECRAWL_API_KEY for live crawling.")

        target = normalize_url(url)
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.BASE_URL}/crawl",
                headers=self._headers(),
                json={
                    "url": target,
                    "limit": limit,
                    "scrapeOptions": {"formats": ["markdown"]},
                },
            )
            response.raise_for_status()
            job = response.json()

        if not job.get("success"):
            message = job.get("error", "Firecrawl crawl failed")
            return self._error_result("crawl", target, message)

        status_url = job.get("url", "")
        if not status_url:
            return self._error_result("crawl", target, "Firecrawl crawl returned no status URL")

        pages = await self._poll_crawl(status_url)
        sources: list[dict[str, str]] = []
        sections: list[str] = []

        for page in pages:
            metadata = page.get("metadata", {}) or {}
            page_url = metadata.get("sourceURL") or metadata.get("url") or target
            title = metadata.get("title") or page_url
            markdown = page.get("markdown", "") or ""
            snippet = markdown[:300]
            sources.append({"title": title, "url": page_url, "snippet": snippet})
            sections.append(f"## {title}\n{markdown[:4000]}")

        content = (
            f"Crawled {len(pages)} pages from {target}:\n\n" + "\n\n".join(sections)
            if sections
            else f"Crawl completed for {target} but no page content was returned."
        )

        return (
            {
                "query": f"crawl {target}",
                "provider": "firecrawl",
                "content": content[:20000],
                "sources": sources,
            },
            _estimate_tokens(content),
            self.COST_PER_CRAWL_PAGE * max(len(pages), 1),
        )

    async def _poll_crawl(self, status_url: str, *, max_attempts: int = 20) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=60.0) as client:
            for _ in range(max_attempts):
                response = await client.get(status_url, headers=self._headers())
                response.raise_for_status()
                data = response.json()
                if data.get("status") == "completed":
                    return data.get("data", []) or []
                await asyncio.sleep(3)
        return []

    @staticmethod
    def pick_scrape_urls(homepage: str, map_sources: list[dict[str, str]], limit: int) -> list[str]:
        home = normalize_url(homepage)
        home_host = urlparse(home).netloc
        picked: list[str] = []
        seen = {home.rstrip("/")}

        keywords = ("pricing", "about", "product", "solutions", "customers", "company", "platform")

        def score(url: str, title: str) -> int:
            combined = f"{url} {title}".lower()
            return sum(1 for keyword in keywords if keyword in combined)

        ranked = sorted(
            map_sources,
            key=lambda source: score(source.get("url", ""), source.get("title", "")),
            reverse=True,
        )

        for source in ranked:
            url = normalize_url(source.get("url", ""))
            if not url or url.rstrip("/") in seen:
                continue
            if urlparse(url).netloc and urlparse(url).netloc != home_host:
                continue
            seen.add(url.rstrip("/"))
            picked.append(url)
            if len(picked) >= limit:
                break

        return picked

    def _mock_result(self, action: str, target: str, message: str) -> tuple[dict[str, Any], int, float]:
        return (
            {
                "query": f"{action} {target}",
                "provider": "firecrawl",
                "content": message,
                "sources": [],
            },
            50,
            0.0,
        )

    def _error_result(self, action: str, target: str, message: str) -> tuple[dict[str, Any], int, float]:
        return (
            {
                "query": f"{action} {target}",
                "provider": "firecrawl",
                "content": f"Firecrawl {action} failed: {message}",
                "sources": [],
            },
            0,
            0.0,
        )


firecrawl_client = FirecrawlClient()
