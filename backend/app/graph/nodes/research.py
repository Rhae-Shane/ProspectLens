import asyncio
from typing import Any

from app.cache.context_cache import context_cache
from app.config import get_settings
from app.graph.intel_queries import build_targeted_intel_queries
from app.graph.search_config import parse_search_config
from app.providers import apollo_client, firecrawl_client, newsapi_client, perplexity_client, producthunt_client, tavily_client

RESEARCH_CONTEXT = "Company: {company}\nWebsite: {website}\nObjective: {objective}"
settings = get_settings()


async def research_node(state: dict[str, Any]) -> dict[str, Any]:
    company = state["company_name"]
    website = state["website"]
    objective = state["objective"]

    cached = await context_cache.get_research(company, website, objective)
    if cached and state.get("retry_count", 0) == 0:
        node_outputs = dict(state.get("node_outputs", {}))
        node_outputs["research"] = {"cached": True, "count": len(cached)}
        return {
            "raw_research": cached,
            "node_outputs": node_outputs,
        }

    plan = state.get("research_plan", {})
    search_config = parse_search_config(plan)
    queries = plan.get("queries", [])
    if not queries:
        queries = [
            f"{company} company overview and business model",
            f"{company} products and services",
            f"{company} target customers and market",
            f"{company} recent news and business signals",
            f"{company} challenges and risks",
        ]

    context = RESEARCH_CONTEXT.format(company=company, website=website, objective=objective)

    async def run_query(query: str) -> list[tuple[dict[str, Any], int, float]]:
        tasks: list[tuple[str, Any]] = []
        if settings.perplexity_api_key:
            tasks.append(("perplexity", perplexity_client.research(query, context)))
        if settings.tavily_api_key:
            tasks.append(
                (
                    "tavily",
                    tavily_client.search(
                        query,
                        context,
                        search_depth=search_config["tavily_search_depth"],
                        max_results=search_config["tavily_max_results"],
                    ),
                )
            )

        if not tasks:
            return [await perplexity_client.research(query, context)]

        gathered = await asyncio.gather(*(coro for _, coro in tasks), return_exceptions=True)
        results: list[tuple[dict[str, Any], int, float]] = []
        for (provider, _), outcome in zip(tasks, gathered, strict=True):
            if isinstance(outcome, Exception):
                results.append(
                    (
                        {
                            "query": query,
                            "provider": provider,
                            "content": f"{provider} search failed: {outcome}",
                            "sources": [],
                        },
                        0,
                        0.0,
                    )
                )
            else:
                results.append(outcome)
        return results

    async def run_news() -> list[tuple[dict[str, Any], int, float]]:
        if not settings.newapiorg_api_key:
            return []
        try:
            return [
                await newsapi_client.search_company_news(
                    company,
                    context,
                    days_back=search_config["news_days_back"],
                    max_results=search_config["news_max_results"],
                )
            ]
        except Exception as exc:
            return [
                (
                    {
                        "query": f"{company} recent news",
                        "provider": "newsapi",
                        "content": f"newsapi search failed: {exc}",
                        "sources": [],
                    },
                    0,
                    0.0,
                )
            ]

    async def run_firecrawl() -> list[tuple[dict[str, Any], int, float]]:
        if not settings.firecrawl_api_key or not website:
            return []

        results: list[tuple[dict[str, Any], int, float]] = []

        async def safe_call(coro: Any) -> tuple[dict[str, Any], int, float] | None:
            try:
                return await coro
            except Exception as exc:
                return (
                    {
                        "query": "firecrawl",
                        "provider": "firecrawl",
                        "content": f"firecrawl request failed: {exc}",
                        "sources": [],
                    },
                    0,
                    0.0,
                )

        try:
            map_result, home_scrape = await asyncio.gather(
                safe_call(
                    firecrawl_client.map_site(
                        website,
                        limit=search_config["firecrawl_map_limit"],
                    )
                ),
                safe_call(firecrawl_client.scrape(website)),
            )
            if map_result:
                results.append(map_result)
            if home_scrape:
                results.append(home_scrape)

            extra_urls = firecrawl_client.pick_scrape_urls(
                website,
                (map_result[0].get("sources", []) if map_result else []),
                search_config["firecrawl_scrape_extra_pages"],
            )
            if extra_urls:
                extra_scrapes = await asyncio.gather(
                    *[safe_call(firecrawl_client.scrape(url)) for url in extra_urls]
                )
                for scrape_result in extra_scrapes:
                    if scrape_result:
                        results.append(scrape_result)

            optional_tasks = []
            if search_config["firecrawl_use_search"]:
                optional_tasks.append(
                    safe_call(
                        firecrawl_client.search(
                            f"{company} {objective}",
                            limit=search_config["firecrawl_search_limit"],
                        )
                    )
                )
            if search_config["firecrawl_use_crawl"]:
                optional_tasks.append(
                    safe_call(
                        firecrawl_client.crawl(
                            website,
                            limit=search_config["firecrawl_crawl_limit"],
                        )
                    )
                )
            if optional_tasks:
                optional_results = await asyncio.gather(*optional_tasks)
                for optional_result in optional_results:
                    if optional_result:
                        results.append(optional_result)
        except Exception as exc:
            results.append(
                (
                    {
                        "query": "firecrawl",
                        "provider": "firecrawl",
                        "content": f"firecrawl pipeline failed: {exc}",
                        "sources": [],
                    },
                    0,
                    0.0,
                )
            )

        return results

    async def run_producthunt() -> list[tuple[dict[str, Any], int, float]]:
        if not search_config["producthunt_use_lookup"]:
            return []
        if not (
            settings.producthunt_developer_token
            or (settings.producthunt_api_key and settings.producthunt_api_secret)
        ):
            return []

        try:
            return [await producthunt_client.lookup_company_launches(company)]
        except Exception as exc:
            return [
                (
                    {
                        "query": f"{company} Product Hunt launch history",
                        "provider": "producthunt",
                        "content": f"producthunt lookup failed: {exc}",
                        "sources": [],
                    },
                    0,
                    0.0,
                )
            ]

    async def run_targeted_intel() -> list[tuple[dict[str, Any], int, float]]:
        if not settings.tavily_api_key:
            return []

        intel_queries = build_targeted_intel_queries(company, search_config)
        if not intel_queries:
            return []

        async def run_intel_query(query: str) -> tuple[dict[str, Any], int, float]:
            try:
                return await tavily_client.search(
                    query,
                    context,
                    search_depth=search_config["tavily_search_depth"],
                    max_results=search_config["tavily_max_results"],
                )
            except Exception as exc:
                return (
                    {
                        "query": query,
                        "provider": "tavily",
                        "content": f"targeted intel search failed: {exc}",
                        "sources": [],
                    },
                    0,
                    0.0,
                )

        return list(await asyncio.gather(*[run_intel_query(query) for query in intel_queries]))

    async def run_apollo() -> list[tuple[dict[str, Any], int, float]]:
        if not settings.apollo_api_key or not website:
            return []
        try:
            return [await apollo_client.enrich_organization(company, website)]
        except Exception as exc:
            return [
                (
                    {
                        "query": f"{company} Apollo company enrichment",
                        "provider": "apollo",
                        "content": f"apollo enrichment failed: {exc}",
                        "sources": [],
                    },
                    0,
                    0.0,
                )
            ]

    (
        query_results,
        news_results,
        firecrawl_results,
        producthunt_results,
        apollo_results,
        intel_results,
    ) = await asyncio.gather(
        asyncio.gather(*[run_query(q) for q in queries]),
        run_news(),
        run_firecrawl(),
        run_producthunt(),
        run_apollo(),
        run_targeted_intel(),
    )

    raw_research: list[dict[str, Any]] = []
    total_tokens = 0
    total_cost = 0.0
    for batch in query_results:
        for result, tokens, cost in batch:
            raw_research.append(result)
            total_tokens += tokens
            total_cost += cost

    for result, tokens, cost in news_results:
        raw_research.append(result)
        total_tokens += tokens
        total_cost += cost

    for result, tokens, cost in firecrawl_results:
        raw_research.append(result)
        total_tokens += tokens
        total_cost += cost

    for result, tokens, cost in producthunt_results:
        raw_research.append(result)
        total_tokens += tokens
        total_cost += cost

    for result, tokens, cost in apollo_results:
        raw_research.append(result)
        total_tokens += tokens
        total_cost += cost

    for result, tokens, cost in intel_results:
        raw_research.append(result)
        total_tokens += tokens
        total_cost += cost

    if state.get("retry_count", 0) == 0:
        await context_cache.set_research(company, website, objective, raw_research)

    providers_used = []
    if settings.perplexity_api_key:
        providers_used.append("perplexity")
    if settings.tavily_api_key:
        providers_used.append("tavily")
    if settings.newapiorg_api_key:
        providers_used.append("newsapi")
    if settings.firecrawl_api_key and website:
        providers_used.append("firecrawl")
    if search_config["producthunt_use_lookup"] and (
        settings.producthunt_developer_token
        or (settings.producthunt_api_key and settings.producthunt_api_secret)
    ):
        providers_used.append("producthunt")
    if settings.apollo_api_key and website:
        providers_used.append("apollo")

    node_outputs = dict(state.get("node_outputs", {}))
    node_outputs["research"] = {
        "queries_run": len(queries),
        "intel_queries_run": len(build_targeted_intel_queries(company, search_config)),
        "results_count": len(raw_research),
        "providers": providers_used,
        "search_config": search_config,
        "cached": False,
    }

    return {
        "raw_research": raw_research,
        "node_outputs": node_outputs,
        "total_tokens": state.get("total_tokens", 0) + total_tokens,
        "total_cost_usd": state.get("total_cost_usd", 0.0) + total_cost,
    }
