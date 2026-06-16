"""Integration tests for native LangGraph execution (astream)."""

from unittest.mock import AsyncMock

import pytest

from app.graph.graph import GRAPH_NODE_NAMES, build_graph
from app.graph.state import initial_state

TEST_SESSION_ID = "f66b1a8b-bb8b-4ded-90cb-416001ebf635"


def _base_state(**overrides):
    state = initial_state(TEST_SESSION_ID, "Acme Corp", "https://acme.com", "Prepare for QBR")
    state.update(overrides)
    return state


def _noop_observability(monkeypatch):
    monkeypatch.setattr(
        "app.graph.observability.emit_node_started",
        AsyncMock(),
    )
    monkeypatch.setattr(
        "app.graph.observability.emit_node_completed",
        AsyncMock(),
    )
    monkeypatch.setattr(
        "app.graph.observability.emit_node_failed",
        AsyncMock(),
    )


@pytest.mark.asyncio
async def test_graph_astream_happy_path(monkeypatch):
    _noop_observability(monkeypatch)
    qc_calls = {"count": 0}

    async def planner_node(state):
        return {
            "research_plan": {"queries": ["acme overview"]},
            "node_outputs": {"planner": {"queries": 1}},
        }

    async def research_node(state):
        return {
            "raw_research": [{"provider": "test", "content": "research", "sources": []}],
            "node_outputs": {"research": {"results_count": 1}},
        }

    async def analyze_node(state):
        return {
            "business_signals": {"products_services": "SaaS platform"},
            "node_outputs": {"analyze": {"ok": True}},
        }

    async def quality_check_node(state):
        qc_calls["count"] += 1
        return {
            "quality_score": 0.9,
            "section_coverage": {"company_overview": 0.9},
            "qc_recovery_queries": [],
            "node_outputs": {"quality_check": {"quality_score": 0.9}},
        }

    async def recovery_node(state):
        raise AssertionError("recovery should not run on happy path")

    async def report_generator_node(state):
        return {
            "report": {"company_overview": "Overview", "sources": []},
            "node_outputs": {"report_generator": {"sections": 1}},
        }

    async def report_validation_node(state):
        return {
            "report_validation": {"passed": True},
            "node_outputs": {"report_validation": {"passed": True}},
        }

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

    graph = build_graph().compile()
    state = _base_state()
    visited: list[str] = []
    final_state = dict(state)

    async for chunk in graph.astream(state, stream_mode="updates"):
        for node_name, updates in chunk.items():
            visited.append(node_name)
            final_state = {**final_state, **updates}

    assert visited == [
        "planner",
        "research",
        "analyze",
        "quality_check",
        "report_generator",
        "report_validation",
    ]
    assert final_state["report"]["company_overview"] == "Overview"
    assert qc_calls["count"] == 1


@pytest.mark.asyncio
async def test_graph_astream_recovery_then_proceed(monkeypatch):
    _noop_observability(monkeypatch)
    qc_scores = [0.5, 0.85]
    qc_calls = {"count": 0}

    async def planner_node(state):
        return {"research_plan": {"queries": ["q1"]}, "node_outputs": {"planner": {}}}

    async def research_node(state):
        existing = list(state.get("raw_research", []))
        existing.append({"provider": "test", "content": "more", "sources": []})
        return {"raw_research": existing, "node_outputs": {"research": {"is_retry": state.get("retry_count", 0) > 0}}}

    async def analyze_node(state):
        return {"business_signals": {"products_services": "product"}, "node_outputs": {"analyze": {}}}

    async def quality_check_node(state):
        score = qc_scores[min(qc_calls["count"], len(qc_scores) - 1)]
        qc_calls["count"] += 1
        return {
            "quality_score": score,
            "section_coverage": {"company_overview": score},
            "qc_recovery_queries": ["gap query"] if score < 0.6 else [],
            "node_outputs": {"quality_check": {"quality_score": score}},
        }

    async def recovery_node(state):
        return {
            "retry_count": state.get("retry_count", 0) + 1,
            "research_plan": {**state.get("research_plan", {}), "recovery_queries": ["gap query"]},
            "node_outputs": {"recovery": {"retry_count": state.get("retry_count", 0) + 1}},
        }

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

    graph = build_graph().compile()
    state = _base_state()
    visited: list[str] = []

    async for chunk in graph.astream(state, stream_mode="updates"):
        for node_name in chunk:
            visited.append(node_name)

    assert visited == [
        "planner",
        "research",
        "analyze",
        "quality_check",
        "recovery",
        "research",
        "analyze",
        "quality_check",
        "report_generator",
        "report_validation",
    ]
    assert qc_calls["count"] == 2


def test_graph_has_seven_observable_nodes():
    graph = build_graph()
    assert set(graph.nodes) == set(GRAPH_NODE_NAMES)
