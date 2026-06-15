from typing import Any

from app.providers import openai_client

PLANNER_SYSTEM = """You are a sales research planner. Given a company and research objective,
create a structured research plan as JSON with these keys:
- queries: list of 4-6 specific web research queries
- signal_categories: list of business signal types to look for
- report_outline: list of section names to cover
- focus_areas: list of 2-3 priority investigation areas
- search_config: object you choose based on the company and objective:
  - tavily_search_depth: "basic", "advanced", or "fast" (deeper for complex/unknown companies)
  - tavily_max_results: integer 3-10 (more sources when the topic is broad or high-stakes)
  - news_days_back: integer 7-90 (shorter for fast-moving sectors, longer for strategic context)
  - news_max_results: integer 3-15 (more when recent news is critical to the objective)
  - firecrawl_map_limit: integer 5-25 (pages to discover on the company website)
  - firecrawl_scrape_extra_pages: integer 0-5 (key subpages to scrape beyond the homepage)
  - firecrawl_use_search: boolean (true only when Firecrawl search adds value beyond Perplexity/Tavily)
  - firecrawl_use_crawl: boolean (true only for deep multi-page site analysis; slower and costlier)
  - firecrawl_search_limit: integer 3-10 (only if firecrawl_use_search is true)
  - firecrawl_crawl_limit: integer 2-10 (only if firecrawl_use_crawl is true)

Return ONLY valid JSON, no markdown."""


async def planner_node(state: dict[str, Any]) -> dict[str, Any]:
    user_prompt = f"""Company: {state['company_name']}
Website: {state['website']}
Research Objective: {state['objective']}

Create a comprehensive research plan for a sales meeting briefing."""

    plan, tokens, cost = await openai_client.complete_json(PLANNER_SYSTEM, user_prompt)

    node_outputs = dict(state.get("node_outputs", {}))
    node_outputs["planner"] = plan

    return {
        "research_plan": plan,
        "node_outputs": node_outputs,
        "total_tokens": state.get("total_tokens", 0) + tokens,
        "total_cost_usd": state.get("total_cost_usd", 0.0) + cost,
    }
