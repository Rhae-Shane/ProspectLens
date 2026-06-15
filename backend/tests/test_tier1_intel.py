from app.graph.intel_queries import build_targeted_intel_queries
from app.graph.qc_utils import unknowns_from_coverage
from app.graph.search_config import parse_search_config


def test_build_targeted_intel_queries_defaults():
    config = parse_search_config({})
    queries = build_targeted_intel_queries("Acme", config)
    assert len(queries) == 4
    assert any("reddit.com" in query for query in queries)
    assert any("g2.com" in query for query in queries)


def test_build_targeted_intel_queries_can_disable():
    config = parse_search_config({"search_config": {"intel_g2_search": False}})
    queries = build_targeted_intel_queries("Acme", config)
    assert len(queries) == 3
    assert all("g2.com" not in query for query in queries)


def test_unknowns_from_coverage():
    unknowns = unknowns_from_coverage(
        {
            "company_overview": 0.9,
            "products_services": 0.4,
            "target_customers": 0.5,
            "sources": 0.8,
        }
    )
    assert len(unknowns) == 2
    assert any("Product and service" in item for item in unknowns)
