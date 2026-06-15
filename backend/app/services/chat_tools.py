from dataclasses import dataclass
import json
import re
from typing import Any

from pydantic import BaseModel, Field

from app.providers import (
    apollo_client,
    firecrawl_client,
    newsapi_client,
    perplexity_client,
    tavily_client,
)

CHAT_TOOL_DEFINITIONS: list[dict[str, Any]] = [
    {
        "id": "web_search",
        "label": "Web Search",
        "description": "Search the web for up-to-date company facts not in the report",
        "icon": "globe",
    },
    {
        "id": "company_enrichment",
        "label": "Company Enrichment",
        "description": "Apollo firmographics: revenue, employees, funding, HQ, tech stack",
        "icon": "building",
    },
    {
        "id": "recent_news",
        "label": "Recent News",
        "description": "Latest news articles about the company",
        "icon": "newspaper",
    },
    {
        "id": "search_report",
        "label": "Search Report",
        "description": "Find relevant sections in the existing research briefing",
        "icon": "search",
    },
    {
        "id": "deep_research",
        "label": "Deep Research",
        "description": "Synthesized research with citations via Perplexity",
        "icon": "sparkles",
    },
    {
        "id": "scrape_website",
        "label": "Scrape Website",
        "description": "Read a company web page (pricing, careers, product docs)",
        "icon": "link",
    },
]

VALID_CHAT_TOOL_IDS = {tool["id"] for tool in CHAT_TOOL_DEFINITIONS}

TOOL_DESCRIPTIONS: dict[str, str] = {
    "web_search": (
        "Search the web for current information about the company. "
        "Use when the report lacks the answer or the user asks for live/recent data."
    ),
    "company_enrichment": (
        "Fetch firmographic data (revenue, employees, funding, HQ, tech stack) from Apollo. "
        "Prefer this for revenue, headcount, and funding questions."
    ),
    "recent_news": (
        "Fetch recent news articles about the company. "
        "Use when the user asks what happened lately, new announcements, or news since the report."
    ),
    "search_report": (
        "Search the existing research briefing for relevant sections. "
        "Use first before external tools when the answer may already be in the report."
    ),
    "deep_research": (
        "Run deeper synthesized research with citations. "
        "Use for complex questions where a simple web search is not enough."
    ),
    "scrape_website": (
        "Scrape and read a specific company web page. "
        "Use for pricing pages, careers, docs, or a URL the user mentions."
    ),
}


@dataclass
class ChatToolContext:
    company_name: str
    website: str
    company_context: str
    report_context: str
    report_content: dict[str, Any]


def get_chat_tools() -> list[dict[str, Any]]:
    return list(CHAT_TOOL_DEFINITIONS)


def normalize_tool_ids(tool_ids: list[str] | None) -> set[str]:
    if not tool_ids:
        return set()
    return {tool_id for tool_id in tool_ids if tool_id in VALID_CHAT_TOOL_IDS}


def _format_provider_result(
    result: dict[str, Any],
    tool_id: str,
    *,
    query: str | None = None,
) -> tuple[str, dict[str, Any], int, float]:
    sources = result.get("sources", [])
    source_lines = "\n".join(
        f"- {source.get('title', 'Source')}: {source.get('url', '')}" for source in sources[:5]
    )
    content = result.get("content", "")
    formatted = content
    if source_lines:
        formatted = f"{content}\n\nSources:\n{source_lines}"

    usage = {
        "tool": tool_id,
        "query": query or result.get("query"),
        "provider": result.get("provider"),
        "sources": sources[:5],
    }
    tokens = max(len(content) // 4, 50)
    cost = float(result.get("_cost", 0.0))
    return formatted, usage, tokens, cost


async def execute_web_search(query: str, company_context: str) -> tuple[str, dict[str, Any], int, float]:
    result, tokens, cost = await tavily_client.search(
        query,
        company_context,
        search_depth="advanced",
        max_results=5,
    )
    formatted, usage, _, _ = _format_provider_result(result, "web_search", query=query)
    return formatted, usage, tokens, cost


async def execute_company_enrichment(ctx: ChatToolContext) -> tuple[str, dict[str, Any], int, float]:
    result, tokens, cost = await apollo_client.enrich_organization(ctx.company_name, ctx.website)
    formatted, usage, _, _ = _format_provider_result(result, "company_enrichment", query=ctx.company_name)
    return formatted, usage, tokens, cost


async def execute_recent_news(
    ctx: ChatToolContext,
    *,
    days_back: int = 30,
) -> tuple[str, dict[str, Any], int, float]:
    result, tokens, cost = await newsapi_client.search_company_news(
        ctx.company_name,
        ctx.company_context,
        days_back=days_back,
        max_results=5,
    )
    formatted, usage, _, _ = _format_provider_result(
        result,
        "recent_news",
        query=f"{ctx.company_name} news ({days_back}d)",
    )
    return formatted, usage, tokens, cost


def execute_search_report(ctx: ChatToolContext, query: str) -> tuple[str, dict[str, Any], int, float]:
    terms = [term for term in re.findall(r"[a-z0-9]+", query.lower()) if len(term) > 2]
    matches: list[str] = []

    if terms:
        for block in ctx.report_context.split("\n\n"):
            block_lower = block.lower()
            if any(term in block_lower for term in terms):
                matches.append(block.strip())

        structured = ctx.report_content.get("structured") or {}
        if structured:
            structured_text = json.dumps(structured, indent=2)
            for line in structured_text.splitlines():
                line_lower = line.lower()
                if any(term in line_lower for term in terms):
                    matches.append(line.strip())

    if not matches and terms:
        return (
            "No matching sections found in the research briefing for that query.",
            {"tool": "search_report", "query": query, "provider": "report"},
            20,
            0.0,
        )

    if not matches:
        preview = ctx.report_context[:2500]
        content = f"Report preview:\n{preview}"
    else:
        content = "Report matches:\n\n" + "\n\n".join(matches[:10])

    usage = {"tool": "search_report", "query": query, "provider": "report", "sources": []}
    return content, usage, max(len(content) // 4, 20), 0.0


async def execute_deep_research(
    query: str,
    company_context: str,
) -> tuple[str, dict[str, Any], int, float]:
    result, tokens, cost = await perplexity_client.research(query, company_context)
    formatted, usage, _, _ = _format_provider_result(result, "deep_research", query=query)
    return formatted, usage, tokens, cost


async def execute_scrape_website(
    ctx: ChatToolContext,
    *,
    url: str = "",
) -> tuple[str, dict[str, Any], int, float]:
    target = url.strip() or ctx.website
    result, tokens, cost = await firecrawl_client.scrape(target)
    formatted, usage, _, _ = _format_provider_result(result, "scrape_website", query=target)
    return formatted, usage, tokens, cost


async def run_chat_tool(
    tool_id: str,
    args: dict[str, Any],
    ctx: ChatToolContext,
) -> tuple[str, dict[str, Any], int, float]:
    if tool_id == "web_search":
        query = str(args.get("query", "")).strip()
        if not query:
            raise ValueError("web_search requires a query")
        return await execute_web_search(query, ctx.company_context)

    if tool_id == "company_enrichment":
        return await execute_company_enrichment(ctx)

    if tool_id == "recent_news":
        days_back = int(args.get("days_back", 30))
        return await execute_recent_news(ctx, days_back=days_back)

    if tool_id == "search_report":
        query = str(args.get("query", "")).strip()
        if not query:
            raise ValueError("search_report requires a query")
        return execute_search_report(ctx, query)

    if tool_id == "deep_research":
        query = str(args.get("query", "")).strip()
        if not query:
            raise ValueError("deep_research requires a query")
        return await execute_deep_research(query, ctx.company_context)

    if tool_id == "scrape_website":
        url = str(args.get("url", "")).strip()
        return await execute_scrape_website(ctx, url=url)

    raise ValueError(f"Unknown tool: {tool_id}")


# Pydantic schemas for LangChain tool binding
class WebSearchInput(BaseModel):
    query: str = Field(description="Specific web search query, e.g. 'Stripe annual revenue 2025'")


class CompanyEnrichmentInput(BaseModel):
    reason: str = Field(
        default="",
        description="Optional reason for enrichment, e.g. 'user asked about revenue'",
    )


class RecentNewsInput(BaseModel):
    days_back: int = Field(default=30, description="How many days back to search for news (default 30)")


class SearchReportInput(BaseModel):
    query: str = Field(description="Terms to find in the research briefing")


class DeepResearchInput(BaseModel):
    query: str = Field(description="Research question to investigate in depth")


class ScrapeWebsiteInput(BaseModel):
    url: str = Field(
        default="",
        description="URL to scrape. Leave empty to use the company website from the session.",
    )


TOOL_SCHEMAS: dict[str, type[BaseModel]] = {
    "web_search": WebSearchInput,
    "company_enrichment": CompanyEnrichmentInput,
    "recent_news": RecentNewsInput,
    "search_report": SearchReportInput,
    "deep_research": DeepResearchInput,
    "scrape_website": ScrapeWebsiteInput,
}
