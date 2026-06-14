from app.graph.graph import build_graph


def test_graph_has_required_nodes():
    graph = build_graph()
    node_names = set(graph.nodes.keys())
    required = {"planner", "research", "analyze", "quality_check", "recovery", "report_generator"}
    assert required.issubset(node_names)
