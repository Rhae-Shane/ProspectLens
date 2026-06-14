"""Quick LangSmith tracing smoke test (adapted from LangSmith quickstart)."""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langgraph.graph import END, MessagesState, StateGraph
from langgraph.prebuilt import ToolNode

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")


@tool
def search(query: str) -> str:
    """Call to surf the web."""
    if "sf" in query.lower() or "san francisco" in query.lower():
        return "It's 60 degrees and foggy."
    return "It's 90 degrees and sunny."


def run_trace_test(endpoint: str) -> tuple[bool, str]:
    os.environ["LANGSMITH_TRACING"] = "true"
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGSMITH_API_KEY"] = os.getenv("LANGSMITH_API_KEY", "")
    os.environ["LANGCHAIN_API_KEY"] = os.environ["LANGSMITH_API_KEY"]
    os.environ["LANGSMITH_PROJECT"] = os.getenv("LANGSMITH_PROJECT", "prospectlens")
    os.environ["LANGCHAIN_PROJECT"] = os.environ["LANGSMITH_PROJECT"]
    os.environ["LANGSMITH_ENDPOINT"] = endpoint
    os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY", "")

    tools = [search]
    tool_node = ToolNode(tools)
    model = ChatOpenAI(model="gpt-4o", temperature=0).bind_tools(tools)

    def should_continue(state: MessagesState) -> Literal["tools", "__end__"]:
        last_message = state["messages"][-1]
        if getattr(last_message, "tool_calls", None):
            return "tools"
        return END

    def call_model(state: MessagesState):
        response = model.invoke(state["messages"])
        return {"messages": [response]}

    workflow = StateGraph(MessagesState)
    workflow.add_node("agent", call_model)
    workflow.add_node("tools", tool_node)
    workflow.add_edge("__start__", "agent")
    workflow.add_conditional_edges("agent", should_continue)
    workflow.add_edge("tools", "agent")
    app = workflow.compile()

    try:
        final_state = app.invoke(
            {"messages": [HumanMessage(content="what is the weather in sf")]},
            config={"configurable": {"thread_id": "langsmith-smoke-test"}},
        )
        content = final_state["messages"][-1].content
        return True, str(content)
    except Exception as exc:
        return False, str(exc)


def main() -> int:
    endpoints = [
        os.getenv("LANGSMITH_ENDPOINT", "https://api.smith.langchain.com"),
        "https://api.smith.langchain.com",
        "https://aws.api.smith.langchain.com",
    ]
    # preserve order, dedupe
    seen: set[str] = set()
    ordered = []
    for ep in endpoints:
        if ep and ep not in seen:
            seen.add(ep)
            ordered.append(ep)

    print("LangSmith smoke test")
    print(f"Project: {os.getenv('LANGSMITH_PROJECT', 'prospectlens')}")
    print(f"API key set: {'yes' if os.getenv('LANGSMITH_API_KEY') else 'no'}")
    print(f"OpenAI key set: {'yes' if os.getenv('OPENAI_API_KEY') else 'no'}")
    print()

    for endpoint in ordered:
        print(f"Testing endpoint: {endpoint}")
        ok, detail = run_trace_test(endpoint)
        if ok:
            print("  status: SUCCESS")
            print(f"  model reply: {detail[:200]}")
            print()
            print("Use this in .env:")
            print(f"  LANGSMITH_ENDPOINT={endpoint}")
            return 0
        print("  status: FAILED")
        print(f"  error: {detail[:500]}")
        print()

    return 1


if __name__ == "__main__":
    sys.exit(main())
