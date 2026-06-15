from typing import Any
from urllib.parse import urlparse

import httpx

from app.config import get_settings

settings = get_settings()


def domain_from_website(website: str) -> str:
    cleaned = website.strip()
    if not cleaned:
        return ""
    if not cleaned.startswith(("http://", "https://")):
        cleaned = f"https://{cleaned}"
    host = urlparse(cleaned).netloc.lower()
    if host.startswith("www."):
        host = host[4:]
    return host


class ApolloClient:
    """Apollo.io API client for B2B company enrichment."""

    ENRICH_URL = "https://api.apollo.io/api/v1/organizations/enrich"

    def __init__(self) -> None:
        self.api_key = settings.apollo_api_key

    async def enrich_organization(self, company: str, website: str) -> tuple[dict[str, Any], int, float]:
        domain = domain_from_website(website)
        if not self.api_key:
            return self._mock_result(company, domain)
        if not domain:
            return self._error_result(company, "No valid website domain provided for Apollo enrichment.")

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(
                self.ENRICH_URL,
                headers={
                    "Content-Type": "application/json",
                    "Cache-Control": "no-cache",
                    "x-api-key": self.api_key,
                },
                params={"domain": domain},
            )
            if response.status_code == 401:
                return self._error_result(company, "Invalid Apollo API credentials.")
            response.raise_for_status()
            data = response.json()

        organization = data.get("organization")
        if not organization:
            return self._not_found_result(company, domain)

        return self._format_result(company, domain, organization)

    def _format_result(
        self,
        company: str,
        domain: str,
        org: dict[str, Any],
    ) -> tuple[dict[str, Any], int, float]:
        industries = org.get("industries") or []
        technologies = org.get("technology_names") or []
        keywords = org.get("keywords") or []

        lines = [
            f"Apollo company enrichment for {company} ({domain}):",
            f"- Official name: {org.get('name', company)}",
            f"- Industry: {org.get('industry') or ', '.join(industries[:3]) or 'Unknown'}",
            f"- Employees: {org.get('estimated_num_employees') or org.get('employee_count') or 'Unknown'}",
            f"- Founded: {org.get('founded_year') or 'Unknown'}",
            f"- Revenue: {org.get('annual_revenue_printed') or 'Unknown'}",
            f"- Funding: {self._format_funding(org)}",
            f"- HQ: {self._format_location(org)}",
        ]

        description = org.get("short_description") or org.get("seo_description") or ""
        if description:
            lines.append(f"- Description: {description[:1200]}")

        if industries:
            lines.append(f"- Industries: {', '.join(industries[:6])}")
        if technologies:
            lines.append(f"- Tech stack (sample): {', '.join(technologies[:20])}")
        if keywords:
            lines.append(f"- Keywords: {', '.join(keywords[:15])}")

        linkedin = org.get("linkedin_url") or ""
        if linkedin:
            lines.append(f"- LinkedIn: {linkedin}")

        content = "\n".join(lines)
        sources = []
        website_url = org.get("website_url") or f"https://{domain}"
        sources.append(
            {
                "title": f"{org.get('name', company)} (Apollo)",
                "url": website_url,
                "snippet": description[:300],
            }
        )
        if linkedin:
            sources.append({"title": f"{org.get('name', company)} LinkedIn", "url": linkedin, "snippet": ""})

        return (
            {
                "query": f"{company} Apollo company enrichment",
                "provider": "apollo",
                "content": content,
                "sources": sources,
            },
            max(len(content) // 4, 100),
            0.0,
        )

    @staticmethod
    def _format_funding(org: dict[str, Any]) -> str:
        total = org.get("total_funding")
        stage = org.get("latest_funding_stage")
        parts = []
        if total:
            parts.append(f"${int(total):,} total")
        if stage:
            parts.append(str(stage))
        return " | ".join(parts) if parts else "Unknown"

    @staticmethod
    def _format_location(org: dict[str, Any]) -> str:
        city = org.get("city") or ""
        state = org.get("state") or ""
        country = org.get("country") or ""
        parts = [part for part in (city, state, country) if part]
        return ", ".join(parts) if parts else "Unknown"

    def _not_found_result(self, company: str, domain: str) -> tuple[dict[str, Any], int, float]:
        content = f"No Apollo organization record found for {company} ({domain})."
        return (
            {
                "query": f"{company} Apollo company enrichment",
                "provider": "apollo",
                "content": content,
                "sources": [],
            },
            50,
            0.0,
        )

    def _error_result(self, company: str, message: str) -> tuple[dict[str, Any], int, float]:
        return (
            {
                "query": f"{company} Apollo company enrichment",
                "provider": "apollo",
                "content": f"Apollo enrichment failed: {message}",
                "sources": [],
            },
            0,
            0.0,
        )

    def _mock_result(self, company: str, domain: str) -> tuple[dict[str, Any], int, float]:
        return (
            {
                "query": f"{company} Apollo company enrichment",
                "provider": "apollo",
                "content": (
                    f"Apollo placeholder for {company} ({domain or 'no domain'}). "
                    "Configure APOLLO_API_KEY for firmographic enrichment."
                ),
                "sources": [],
            },
            50,
            0.0,
        )


apollo_client = ApolloClient()
