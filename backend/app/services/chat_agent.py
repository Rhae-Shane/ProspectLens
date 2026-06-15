from typing import Any

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import StructuredTool
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from app.config import get_settings
from app.services.chat_tools import execute_web_search

settings = get_settings()

WEB_SEARCH_DESCRIPTION = (
    "Search the web for current information about the company. "
    "Use when the research report does not contain the answer, "
    "the user asks for recent/live data, or the user enabled web search."
)


class WebSearchInput(BaseModel):
    query: str = Field(description="Specific web search query, e.g. 'Stripe annual revenue 2025'")


def _estimate_cost(input_tokens: int, output_tokens: int) -> float:
    return (input_tokens / 1_000_000 * 2.50) + (output_tokens / 1_000_000 * 10.00)


def _usage_tokens(message: AIMessage) -> tuple[int, float]:
    usage = message.usage_metadata or {}
    input_tokens = int(usage.get("input_tokens", 0))
    output_tokens = int(usage.get("output_tokens", 0))
    total = input_tokens + output_tokens
    return total, _estimate_cost(input_tokens, output_tokens)


async def run_chat_agent(
    *,
    system_prompt: str,
    user_prompt: str,
    company_context: str,
    user_enabled_tools: set[str],
    allow_auto_tools: bool = True,
) -> tuple[str, list[dict[str, Any]], int, float]:
    tools_used: list[dict[str, Any]] = []
    total_tokens = 0
    total_cost = 0.0

    async def web_search(query: str) -> str:
        formatted, usage, tokens, cost = await execute_web_search(query, company_context)
        tools_used.append(usage)
        nonlocal total_tokens, total_cost
        total_tokens += tokens
        total_cost += cost
        return formatted

    bound_tools: list[StructuredTool] = []
    if allow_auto_tools or "web_search" in user_enabled_tools:
        bound_tools.append(
            StructuredTool.from_function(
                coroutine=web_search,
                name="web_search",
                description=WEB_SEARCH_DESCRIPTION,
                args_schema=WebSearchInput,
            )
        )

    model = ChatOpenAI(
        model=settings.openai_model,
        api_key=settings.openai_api_key or "sk-placeholder",
        temperature=0.2,
    )
    if bound_tools:
        model = model.bind_tools(bound_tools)

    enabled_note = ""
    if "web_search" in user_enabled_tools:
        enabled_note = (
            "\n\nThe user enabled the web_search tool for this message. "
            "Use web_search when the report does not fully answer the question."
        )

    messages: list[Any] = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt + enabled_note),
    ]

    for _ in range(4):
        response = await model.ainvoke(messages)
        if not isinstance(response, AIMessage):
            response = AIMessage(content=str(response))

        tokens, cost = _usage_tokens(response)
        total_tokens += tokens
        total_cost += cost

        tool_calls = response.tool_calls or []
        if not tool_calls:
            content = response.content
            if isinstance(content, list):
                content = "".join(str(part) for part in content)
            return str(content).strip(), tools_used, total_tokens, total_cost

        messages.append(response)
        for tool_call in tool_calls:
            if isinstance(tool_call, dict):
                tool_name = tool_call.get("name")
                tool_args = tool_call.get("args") or {}
                tool_id = tool_call.get("id") or tool_name
            else:
                tool_name = getattr(tool_call, "name", None)
                tool_args = getattr(tool_call, "args", None) or {}
                tool_id = getattr(tool_call, "id", None) or tool_name

            if tool_name == "web_search":
                query = str(tool_args.get("query", "")).strip()
                if not query:
                    result_text = "Error: web_search requires a query."
                else:
                    result_text, usage, search_tokens, search_cost = await execute_web_search(
                        query, company_context
                    )
                    tools_used.append(usage)
                    total_tokens += search_tokens
                    total_cost += search_cost
            else:
                result_text = f"Unknown tool: {tool_name}"

            messages.append(ToolMessage(content=result_text, tool_call_id=tool_id))

    return (
        "I could not finish answering with the available tools. Please try again.",
        tools_used,
        total_tokens,
        total_cost,
    )
