import asyncio
from typing import Any

from app.cache.context_cache import context_cache
from app.providers import perplexity_client

RESEARCH_CONTEXT = "Company: {company}\nWebsite: {website}\nObjective: {objective}"


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

    async def run_query(query: str):
        return await perplexity_client.research(query, context)

    results = await asyncio.gather(*[run_query(q) for q in queries])

    raw_research = []
    total_tokens = 0
    total_cost = 0.0
    for result, tokens, cost in results:
        raw_research.append(result)
        total_tokens += tokens
        total_cost += cost

    if state.get("retry_count", 0) == 0:
        await context_cache.set_research(company, website, objective, raw_research)

    node_outputs = dict(state.get("node_outputs", {}))
    node_outputs["research"] = {"queries_run": len(queries), "cached": False}

    return {
        "raw_research": raw_research,
        "node_outputs": node_outputs,
        "total_tokens": state.get("total_tokens", 0) + total_tokens,
        "total_cost_usd": state.get("total_cost_usd", 0.0) + total_cost,
    }
