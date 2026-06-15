import re
from typing import Any

import httpx

from app.config import get_settings

settings = get_settings()

POST_QUERY = """
query PostBySlug($slug: String!) {
  post(slug: $slug) {
    name
    tagline
    votesCount
    commentsCount
    createdAt
    featuredAt
    url
    website
    topics { edges { node { name } } }
  }
}
"""


def slug_candidates(company: str) -> list[str]:
    base = company.strip().lower()
    candidates: list[str] = []

    simple = re.sub(r"[^a-z0-9]+", "-", base).strip("-")
    if simple:
        candidates.append(simple)

    compact = re.sub(r"[^a-z0-9]+", "", base)
    if compact and compact not in candidates:
        candidates.append(compact)

    if simple:
        first = simple.split("-", 1)[0]
        if first and first not in candidates:
            candidates.append(first)

    return candidates[:5]


def normalize_name(name: str) -> str:
    cleaned = name.lower()
    for suffix in (" inc", " corp", " llc", " ltd", " gmbh", " co", " company"):
        if cleaned.endswith(suffix):
            cleaned = cleaned[: -len(suffix)]
    return re.sub(r"[^a-z0-9 ]", "", cleaned).strip()


def significant_words(name: str) -> list[str]:
    stopwords = {"the", "and", "for", "labs", "corp", "inc", "llc", "ltd", "co"}
    return [word for word in normalize_name(name).split() if len(word) > 2 and word not in stopwords]


def names_match(company: str, post_name: str) -> bool:
    company_words = significant_words(company)
    post_words = significant_words(post_name)
    if not company_words or not post_words:
        return False

    if company_words == post_words:
        return True

    if len(company_words) == 1:
        return company_words[0] in post_words

    overlap = sum(1 for word in company_words if word in post_words)
    return overlap >= min(2, len(company_words))


class ProductHuntClient:
    """Product Hunt GraphQL API client for launch history research."""

    GRAPHQL_URL = "https://api.producthunt.com/v2/api/graphql"
    TOKEN_URL = "https://api.producthunt.com/v2/oauth/token"

    def __init__(self) -> None:
        self.developer_token = settings.producthunt_developer_token
        self.api_key = settings.producthunt_api_key
        self.api_secret = settings.producthunt_api_secret

    async def _access_token(self) -> str | None:
        if self.developer_token:
            return self.developer_token
        if not self.api_key or not self.api_secret:
            return None

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self.TOKEN_URL,
                json={
                    "client_id": self.api_key,
                    "client_secret": self.api_secret,
                    "grant_type": "client_credentials",
                },
            )
            response.raise_for_status()
            data = response.json()
        return data.get("access_token")

    async def lookup_company_launches(self, company: str) -> tuple[dict[str, Any], int, float]:
        token = await self._access_token()
        if not token:
            return self._mock_result(company)

        slugs = slug_candidates(company)
        async with httpx.AsyncClient(timeout=30.0) as client:
            for slug in slugs:
                response = await client.post(
                    self.GRAPHQL_URL,
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                    json={"query": POST_QUERY, "variables": {"slug": slug}},
                )
                response.raise_for_status()
                payload = response.json()

                if payload.get("errors"):
                    continue

                post = (payload.get("data") or {}).get("post")
                if not post or not names_match(company, post.get("name", "")):
                    continue

                return self._format_result(company, post, matched_slug=slug)

        return self._not_found_result(company, slugs)

    def _format_result(
        self,
        company: str,
        post: dict[str, Any],
        *,
        matched_slug: str,
    ) -> tuple[dict[str, Any], int, float]:
        topics = [
            edge.get("node", {}).get("name", "")
            for edge in (post.get("topics") or {}).get("edges", [])
            if edge.get("node", {}).get("name")
        ]
        launch_date = (post.get("featuredAt") or post.get("createdAt") or "")[:10]
        ph_url = post.get("url", "")

        lines = [
            f"Product Hunt launch found for {company} (slug: {matched_slug}):",
            f"- Product: {post.get('name', company)}",
            f"- Tagline: {post.get('tagline', 'N/A')}",
            f"- Launch date: {launch_date or 'Unknown'}",
            f"- Upvotes: {post.get('votesCount', 0)}",
            f"- Comments: {post.get('commentsCount', 0)}",
        ]
        if topics:
            lines.append(f"- Topics: {', '.join(topics)}")
        if ph_url:
            lines.append(f"- Product Hunt URL: {ph_url}")

        content = "\n".join(lines)
        sources = []
        if ph_url:
            sources.append(
                {
                    "title": f"{post.get('name', company)} on Product Hunt",
                    "url": ph_url,
                    "snippet": post.get("tagline", ""),
                }
            )

        return (
            {
                "query": f"{company} Product Hunt launch history",
                "provider": "producthunt",
                "content": content,
                "sources": sources,
            },
            max(len(content) // 4, 50),
            0.0,
        )

    def _not_found_result(self, company: str, slugs: list[str]) -> tuple[dict[str, Any], int, float]:
        tried = ", ".join(slugs) if slugs else "none"
        content = (
            f"No Product Hunt launch found for {company}. "
            f"Tried slugs: {tried}. "
            "This company may not have launched on Product Hunt, or uses a different product name."
        )
        return (
            {
                "query": f"{company} Product Hunt launch history",
                "provider": "producthunt",
                "content": content,
                "sources": [],
            },
            50,
            0.0,
        )

    def _mock_result(self, company: str) -> tuple[dict[str, Any], int, float]:
        return (
            {
                "query": f"{company} Product Hunt launch history",
                "provider": "producthunt",
                "content": (
                    f"Product Hunt placeholder for {company}. "
                    "Configure PRODUCTHUNT_DEVELOPER_TOKEN for launch history."
                ),
                "sources": [],
            },
            50,
            0.0,
        )


producthunt_client = ProductHuntClient()
