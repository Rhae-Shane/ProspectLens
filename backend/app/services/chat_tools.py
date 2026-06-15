from typing import Any

from app.providers import tavily_client

CHAT_TOOL_DEFINITIONS: list[dict[str, Any]] = [
    {
        "id": "web_search",
        "label": "Web Search",
        "description": "Search the web for up-to-date company facts not in the report",
        "icon": "globe",
    },
]

VALID_CHAT_TOOL_IDS = {tool["id"] for tool in CHAT_TOOL_DEFINITIONS}


def get_chat_tools() -> list[dict[str, Any]]:
    return list(CHAT_TOOL_DEFINITIONS)


def normalize_tool_ids(tool_ids: list[str] | None) -> set[str]:
    if not tool_ids:
        return set()
    return {tool_id for tool_id in tool_ids if tool_id in VALID_CHAT_TOOL_IDS}


async def execute_web_search(query: str, company_context: str) -> tuple[str, dict[str, Any], int, float]:
    result, tokens, cost = await tavily_client.search(
        query,
        company_context,
        search_depth="advanced",
        max_results=5,
    )
    sources = result.get("sources", [])
    source_lines = "\n".join(
        f"- {source.get('title', 'Source')}: {source.get('url', '')}" for source in sources[:5]
    )
    content = result.get("content", "")
    formatted = content
    if source_lines:
        formatted = f"{content}\n\nSources:\n{source_lines}"

    usage = {
        "tool": "web_search",
        "query": query,
        "provider": result.get("provider", "tavily"),
        "sources": sources[:5],
    }
    return formatted, usage, tokens, cost
