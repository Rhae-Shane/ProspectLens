"""Tests for LangGraph checkpoint resume with MemorySaver."""

from unittest.mock import AsyncMock

import pytest
from langgraph.checkpoint.memory import MemorySaver

from app.graph.graph import build_graph
from app.graph.state import initial_state

TEST_SESSION_ID = "f66b1a8b-bb8b-4ded-90cb-416001ebf635"
THREAD_CONFIG = {"configurable": {"thread_id": TEST_SESSION_ID}}


def _base_state(**overrides):
    state = initial_state(TEST_SESSION_ID, "Acme Corp", "https://acme.com", "Prepare for QBR")
    state.update(overrides)
    return state


def _noop_observability(monkeypatch):
    monkeypatch.setattr("app.graph.observability.emit_node_started", AsyncMock())
    monkeypatch.setattr("app.graph.observability.emit_node_completed", AsyncMock())
    monkeypatch.setattr("app.graph.observability.emit_node_failed", AsyncMock())


@pytest.mark.asyncio
async def test_checkpoint_resume_continues_from_last_node(monkeypatch):
    _noop_observability(monkeypatch)
    planner_ran = {"count": 0}

    async def planner_node(state):
        planner_ran["count"] += 1
        return {"research_plan": {"queries": ["q1"]}, "node_outputs": {"planner": {}}}

    async def research_node(state):
        return {"raw_research": [{"provider": "test", "content": "data", "sources": []}], "node_outputs": {"research": {}}}

    async def analyze_node(state):
        return {"business_signals": {"products_services": "SaaS"}, "node_outputs": {"analyze": {}}}

    async def quality_check_node(state):
        return {
            "quality_score": 0.9,
            "section_coverage": {"company_overview": 0.9},
            "qc_recovery_queries": [],
            "node_outputs": {"quality_check": {}},
        }

    async def recovery_node(state):
        return {"node_outputs": {"recovery": {}}}

    async def report_generator_node(state):
        return {"report": {"company_overview": "Done"}, "node_outputs": {"report_generator": {}}}

    async def report_validation_node(state):
        return {"report_validation": {"passed": True}, "node_outputs": {"report_validation": {}}}

    for name, fn in {
        "planner_node": planner_node,
        "research_node": research_node,
        "analyze_node": analyze_node,
        "quality_check_node": quality_check_node,
        "recovery_node": recovery_node,
        "report_generator_node": report_generator_node,
        "report_validation_node": report_validation_node,
    }.items():
        monkeypatch.setattr(f"app.graph.graph.{name}", fn)

    checkpointer = MemorySaver()
    graph = build_graph().compile(checkpointer=checkpointer)
    state = _base_state()

    visited: list[str] = []
    async for chunk in graph.astream(state, config=THREAD_CONFIG, stream_mode="updates"):
        for node_name in chunk:
            visited.append(node_name)
        if node_name == "analyze":
            break

    assert visited == ["planner", "research", "analyze"]
    assert planner_ran["count"] == 1

    snapshot = await graph.aget_state(THREAD_CONFIG)
    assert snapshot.next

    resumed: list[str] = []
    async for chunk in graph.astream(None, config=THREAD_CONFIG, stream_mode="updates"):
        for node_name in chunk:
            resumed.append(node_name)

    assert resumed == ["quality_check", "report_generator", "report_validation"]
    assert planner_ran["count"] == 1

    final = await graph.aget_state(THREAD_CONFIG)
    assert final.values["report"]["company_overview"] == "Done"


@pytest.mark.asyncio
async def test_fresh_run_clears_checkpoint(monkeypatch):
    _noop_observability(monkeypatch)

    async def planner_node(state):
        return {"research_plan": {"queries": ["q1"]}, "node_outputs": {"planner": {}}}

    async def research_node(state):
        return {"raw_research": [], "node_outputs": {"research": {}}}

    async def analyze_node(state):
        return {"business_signals": {}, "node_outputs": {"analyze": {}}}

    async def quality_check_node(state):
        return {
            "quality_score": 0.9,
            "section_coverage": {"company_overview": 0.9},
            "qc_recovery_queries": [],
            "node_outputs": {"quality_check": {}},
        }

    async def recovery_node(state):
        return {"node_outputs": {"recovery": {}}}

    async def report_generator_node(state):
        return {"report": {"company_overview": "First"}, "node_outputs": {"report_generator": {}}}

    async def report_validation_node(state):
        return {"report_validation": {"passed": True}, "node_outputs": {"report_validation": {}}}

    for name, fn in {
        "planner_node": planner_node,
        "research_node": research_node,
        "analyze_node": analyze_node,
        "quality_check_node": quality_check_node,
        "recovery_node": recovery_node,
        "report_generator_node": report_generator_node,
        "report_validation_node": report_validation_node,
    }.items():
        monkeypatch.setattr(f"app.graph.graph.{name}", fn)

    checkpointer = MemorySaver()
    graph = build_graph().compile(checkpointer=checkpointer)
    state = _base_state()

    async for _ in graph.astream(state, config=THREAD_CONFIG, stream_mode="updates"):
        pass

    await checkpointer.adelete_thread(TEST_SESSION_ID)

    async def report_generator_node_v2(state):
        return {"report": {"company_overview": "Second"}, "node_outputs": {"report_generator": {}}}

    monkeypatch.setattr("app.graph.graph.report_generator_node", report_generator_node_v2)

    graph = build_graph().compile(checkpointer=checkpointer)
    async for _ in graph.astream(_base_state(), config=THREAD_CONFIG, stream_mode="updates"):
        pass

    final = await graph.aget_state(THREAD_CONFIG)
    assert final.values["report"]["company_overview"] == "Second"
