from typing import Any

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import StructuredTool
from langchain_openai import ChatOpenAI

from app.config import get_settings
from app.services.chat_tools import (
    CHAT_TOOL_DEFINITIONS,
    TOOL_DESCRIPTIONS,
    TOOL_SCHEMAS,
    ChatToolContext,
    run_chat_tool,
)

settings = get_settings()


def _estimate_cost(input_tokens: int, output_tokens: int) -> float:
    return (input_tokens / 1_000_000 * 2.50) + (output_tokens / 1_000_000 * 10.00)


def _usage_tokens(message: AIMessage) -> tuple[int, float]:
    usage = message.usage_metadata or {}
    input_tokens = int(usage.get("input_tokens", 0))
    output_tokens = int(usage.get("output_tokens", 0))
    total = input_tokens + output_tokens
    return total, _estimate_cost(input_tokens, output_tokens)


def _build_bound_tools(ctx: ChatToolContext) -> list[StructuredTool]:
    bound: list[StructuredTool] = []

    for tool_def in CHAT_TOOL_DEFINITIONS:
        tool_id = tool_def["id"]
        schema = TOOL_SCHEMAS[tool_id]
        description = TOOL_DESCRIPTIONS[tool_id]

        async def _invoke(tool_id: str = tool_id, **kwargs: Any) -> str:
            formatted, _, _, _ = await run_chat_tool(tool_id, kwargs, ctx)
            return formatted

        bound.append(
            StructuredTool.from_function(
                coroutine=_invoke,
                name=tool_id,
                description=description,
                args_schema=schema,
            )
        )

    return bound


async def run_chat_agent(
    *,
    system_prompt: str,
    user_prompt: str,
    tool_context: ChatToolContext,
    user_enabled_tools: set[str],
    allow_auto_tools: bool = True,
) -> tuple[str, list[dict[str, Any]], int, float]:
    tools_used: list[dict[str, Any]] = []
    total_tokens = 0
    total_cost = 0.0

    bound_tools = _build_bound_tools(tool_context) if allow_auto_tools else []

    model = ChatOpenAI(
        model=settings.openai_model,
        api_key=settings.openai_api_key or "sk-placeholder",
        temperature=0.2,
    )
    if bound_tools:
        model = model.bind_tools(bound_tools)

    enabled_note = ""
    if user_enabled_tools:
        labels = ", ".join(sorted(user_enabled_tools))
        enabled_note = (
            f"\n\nThe user enabled these tools for this message: {labels}. "
            "Use them when helpful to answer the question."
        )

    messages: list[Any] = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt + enabled_note),
    ]

    for _ in range(6):
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

            try:
                result_text, usage, tool_tokens, tool_cost = await run_chat_tool(
                    str(tool_name),
                    tool_args,
                    tool_context,
                )
                tools_used.append(usage)
                total_tokens += tool_tokens
                total_cost += tool_cost
            except ValueError as exc:
                result_text = f"Tool error: {exc}"
            except Exception as exc:
                result_text = f"Tool failed: {exc}"

            messages.append(ToolMessage(content=result_text, tool_call_id=tool_id))

    return (
        "I could not finish answering with the available tools. Please try again.",
        tools_used,
        total_tokens,
        total_cost,
    )
