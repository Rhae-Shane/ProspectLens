from langgraph.graph import END, StateGraph

from app.graph.nodes import (
    analyze_node,
    planner_node,
    quality_check_node,
    recovery_node,
    report_generator_node,
    research_node,
    route_after_quality,
)
from app.graph.state import ResearchState


def build_graph() -> StateGraph:
    graph = StateGraph(ResearchState)

    graph.add_node("planner", planner_node)
    graph.add_node("research", research_node)
    graph.add_node("analyze", analyze_node)
    graph.add_node("quality_check", quality_check_node)
    graph.add_node("recovery", recovery_node)
    graph.add_node("report_generator", report_generator_node)

    graph.set_entry_point("planner")
    graph.add_edge("planner", "research")
    graph.add_edge("research", "analyze")
    graph.add_edge("analyze", "quality_check")
    graph.add_conditional_edges(
        "quality_check",
        route_after_quality,
        {
            "report_generator": "report_generator",
            "recovery": "recovery",
        },
    )
    graph.add_edge("recovery", "research")
    graph.add_edge("report_generator", END)

    return graph


def compile_graph():
    graph = build_graph()
    return graph.compile()
