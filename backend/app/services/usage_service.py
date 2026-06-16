from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import ChatMessage, WorkflowEvent

settings = get_settings()

OPENAI_NODES = {
    "planner",
    "analyze",
    "quality_check",
    "recovery",
    "report_generator",
    "report_snapshot",
    "report_products",
    "report_stakeholders",
    "report_signals_risks",
    "report_discovery",
    "report_outreach",
}

CHAT_TOOL_PROVIDER_MAP = {
    "web_search": "tavily",
    "company_enrichment": "apollo",
    "recent_news": "newsapi",
    "deep_research": "perplexity",
    "scrape_website": "firecrawl",
}

CHAT_TOOL_COST_ESTIMATES = {
    "tavily": 0.001,
    "apollo": 0.01,
    "newsapi": 0.0,
    "perplexity": 0.005,
    "firecrawl": 0.002,
}

PROVIDER_DEFINITIONS: list[dict[str, Any]] = [
    {
        "id": "openai",
        "label": "OpenAI",
        "description": "LLM planning, analysis, reports, and chat",
        "key_field": "openai_api_key",
        "budget_field": "openai_monthly_budget_usd",
        "default_budget_usd": 5.0,
        "free_allowance_label": "$5 free platform credits",
        "website": "openai.com",
        "brand_color": "#10A37F",
    },
    {
        "id": "tavily",
        "label": "Tavily",
        "description": "Web search during research and chat",
        "key_field": "tavily_api_key",
        "budget_field": "tavily_monthly_budget_usd",
        "default_budget_usd": 5.0,
        "free_allowance_label": "1,000 free search credits / month",
        "website": "tavily.com",
        "brand_color": "#6366F1",
    },
    {
        "id": "perplexity",
        "label": "Perplexity",
        "description": "Deep web research",
        "key_field": "perplexity_api_key",
        "budget_field": "perplexity_monthly_budget_usd",
        "default_budget_usd": 5.0,
        "free_allowance_label": "$5 free API credits / month",
        "website": "perplexity.ai",
        "brand_color": "#20B8CD",
    },
    {
        "id": "newsapi",
        "label": "NewsAPI",
        "description": "Recent company news",
        "key_field": "newapiorg_api_key",
        "budget_field": "newsapi_monthly_budget_usd",
        "default_budget_usd": 0.0,
        "free_allowance_label": "100 free requests / day (dev)",
        "website": "newsapi.org",
        "brand_color": "#E63946",
    },
    {
        "id": "firecrawl",
        "label": "Firecrawl",
        "description": "Website scraping",
        "key_field": "firecrawl_api_key",
        "budget_field": "firecrawl_monthly_budget_usd",
        "default_budget_usd": 5.0,
        "free_allowance_label": "500 free scrape pages / month",
        "website": "firecrawl.dev",
        "brand_color": "#F97316",
    },
    {
        "id": "apollo",
        "label": "Apollo",
        "description": "Company enrichment",
        "key_field": "apollo_api_key",
        "budget_field": "apollo_monthly_budget_usd",
        "default_budget_usd": 5.0,
        "free_allowance_label": "Free enrichment trial credits",
        "website": "apollo.io",
        "brand_color": "#FFC107",
    },
    {
        "id": "producthunt",
        "label": "Product Hunt",
        "description": "Product launch lookup",
        "key_field": "producthunt_developer_token",
        "budget_field": "producthunt_monthly_budget_usd",
        "default_budget_usd": 0.0,
        "free_allowance_label": "Free GraphQL API access",
        "website": "producthunt.com",
        "brand_color": "#DA552F",
    },
]


def _key_hint(api_key: str) -> str | None:
    if not api_key or len(api_key) < 4:
        return None
    return f"••••{api_key[-4:]}"


def _is_producthunt_configured() -> bool:
    return bool(
        settings.producthunt_developer_token
        or (settings.producthunt_api_key and settings.producthunt_api_secret)
    )


def _configured_research_providers() -> list[str]:
    providers: list[str] = []
    if settings.perplexity_api_key:
        providers.append("perplexity")
    if settings.tavily_api_key:
        providers.append("tavily")
    if settings.newapiorg_api_key:
        providers.append("newsapi")
    if settings.firecrawl_api_key:
        providers.append("firecrawl")
    if settings.apollo_api_key:
        providers.append("apollo")
    if _is_producthunt_configured():
        providers.append("producthunt")
    return providers


def _provider_configured(provider_id: str, key_field: str) -> bool:
    if provider_id == "producthunt":
        return _is_producthunt_configured()
    return bool(getattr(settings, key_field, ""))


def _provider_key_value(provider_id: str, key_field: str) -> str:
    if provider_id == "producthunt":
        return settings.producthunt_developer_token or settings.producthunt_api_key
    return getattr(settings, key_field, "")


def _estimate_chat_token_cost(tokens: int) -> float:
    return (tokens / 1_000_000) * 6.0


class UsageService:
    @staticmethod
    async def get_api_key_usage(db: AsyncSession) -> dict[str, Any]:
        node_rows = await db.execute(
            select(
                WorkflowEvent.node,
                func.coalesce(func.sum(WorkflowEvent.cost_usd), 0.0),
                func.coalesce(func.sum(WorkflowEvent.tokens), 0),
            ).group_by(WorkflowEvent.node)
        )

        node_costs: dict[str, float] = {}
        node_tokens: dict[str, int] = {}
        for node, cost, tokens in node_rows.all():
            node_costs[node] = float(cost or 0.0)
            node_tokens[node] = int(tokens or 0)

        chat_tokens_row = await db.execute(
            select(func.coalesce(func.sum(ChatMessage.tokens), 0)).where(ChatMessage.role == "assistant")
        )
        chat_tokens = int(chat_tokens_row.scalar() or 0)

        chat_messages = await db.execute(
            select(ChatMessage.metadata_).where(ChatMessage.role == "assistant")
        )
        chat_tool_counts: dict[str, int] = {provider_id: 0 for provider_id in CHAT_TOOL_PROVIDER_MAP.values()}
        for (metadata,) in chat_messages.all():
            if not metadata:
                continue
            for usage in metadata.get("tools_used", []):
                tool_name = usage.get("tool")
                provider = CHAT_TOOL_PROVIDER_MAP.get(tool_name)
                if provider:
                    chat_tool_counts[provider] = chat_tool_counts.get(provider, 0) + 1

        used_by_provider: dict[str, float] = {provider["id"]: 0.0 for provider in PROVIDER_DEFINITIONS}
        tokens_by_provider: dict[str, int] = {provider["id"]: 0 for provider in PROVIDER_DEFINITIONS}

        openai_cost = sum(node_costs.get(node, 0.0) for node in OPENAI_NODES)
        openai_cost += _estimate_chat_token_cost(chat_tokens)
        openai_tokens = sum(node_tokens.get(node, 0) for node in OPENAI_NODES) + chat_tokens
        used_by_provider["openai"] = round(openai_cost, 4)
        tokens_by_provider["openai"] = openai_tokens

        research_cost = node_costs.get("research", 0.0)
        research_tokens = node_tokens.get("research", 0)
        configured_research = _configured_research_providers()
        if configured_research and research_cost > 0:
            share = research_cost / len(configured_research)
            token_share = research_tokens // len(configured_research)
            for provider_id in configured_research:
                used_by_provider[provider_id] = round(used_by_provider.get(provider_id, 0.0) + share, 4)
                tokens_by_provider[provider_id] = tokens_by_provider.get(provider_id, 0) + token_share

        for provider_id, count in chat_tool_counts.items():
            estimate = CHAT_TOOL_COST_ESTIMATES.get(provider_id, 0.0) * count
            used_by_provider[provider_id] = round(used_by_provider.get(provider_id, 0.0) + estimate, 4)

        providers: list[dict[str, Any]] = []
        total_used = 0.0
        total_budget = 0.0

        for provider in PROVIDER_DEFINITIONS:
            provider_id = provider["id"]
            key_field = provider["key_field"]
            budget_field = provider["budget_field"]
            configured = _provider_configured(provider_id, key_field)
            key_value = _provider_key_value(provider_id, key_field)
            budget_usd = float(getattr(settings, budget_field, provider["default_budget_usd"]))
            used_usd = used_by_provider.get(provider_id, 0.0)
            credits_left = max(budget_usd - used_usd, 0.0)
            usage_percent = min((used_usd / budget_usd) * 100, 100) if budget_usd > 0 else 0.0

            total_used += used_usd
            total_budget += budget_usd

            providers.append(
                {
                    "id": provider_id,
                    "label": provider["label"],
                    "description": provider["description"],
                    "website": provider.get("website"),
                    "brand_color": provider.get("brand_color"),
                    "plan_label": "Free tier",
                    "free_allowance_label": provider.get("free_allowance_label", "Free usage"),
                    "configured": configured,
                    "key_hint": _key_hint(key_value) if configured else None,
                    "used_usd": used_usd,
                    "tokens_used": tokens_by_provider.get(provider_id, 0),
                    "free_allowance_usd": budget_usd,
                    "budget_usd": budget_usd,
                    "credits_left_usd": round(credits_left, 4),
                    "usage_percent": round(usage_percent, 1),
                }
            )

        return {
            "providers": providers,
            "summary": {
                "plan_label": "Free tier usage",
                "total_used_usd": round(total_used, 4),
                "total_free_allowance_usd": round(total_budget, 4),
                "total_budget_usd": round(total_budget, 4),
                "total_credits_left_usd": round(max(total_budget - total_used, 0.0), 4),
                "configured_count": sum(1 for provider in providers if provider["configured"]),
                "provider_count": len(providers),
            },
        }
