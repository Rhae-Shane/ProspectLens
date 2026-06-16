import pytest
from app.graph.nodes.quality import route_after_quality


def test_route_after_quality_proceeds_on_high_score():
    state = {"quality_score": 0.85, "retry_count": 0}
    assert route_after_quality(state) == "report_generator"


def test_route_after_quality_retries_on_low_score():
    state = {
        "quality_score": 0.5,
        "retry_count": 0,
        "section_coverage": {"company_overview": 0.3},
    }
    assert route_after_quality(state) == "recovery"


def test_route_after_quality_proceeds_at_max_retries():
    state = {"quality_score": 0.3, "retry_count": 2}
    assert route_after_quality(state) == "report_generator"


def test_initial_state_structure():
    from app.graph.state import initial_state

    state = initial_state("id", "Acme", "https://acme.com", "Prepare for QBR")
    assert state["company_name"] == "Acme"
    assert state["retry_count"] == 0
    assert state["status"] == "running"


def test_report_schema_validation():
    from app.schemas import ReportContent, SourceItem

    report = ReportContent(
        company_overview="Overview",
        products_services="Products",
        target_customers="Enterprise",
        business_signals="Growing",
        risks_challenges="Competition",
        discovery_questions=["What is your timeline?"],
        outreach_strategy="Lead with value",
        unknowns=["Budget"],
        sources=[SourceItem(title="Site", url="https://example.com", snippet="Info")],
    )
    assert len(report.discovery_questions) == 1
