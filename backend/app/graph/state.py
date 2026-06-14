from typing import Annotated, Any, TypedDict


class ResearchState(TypedDict, total=False):
    session_id: str
    company_name: str
    website: str
    objective: str
    research_plan: dict[str, Any]
    raw_research: list[dict[str, Any]]
    business_signals: dict[str, Any]
    quality_score: float
    quality_issues: list[str]
    retry_count: int
    report: dict[str, Any]
    node_outputs: dict[str, Any]
    errors: list[dict[str, Any]]
    status: str
    total_tokens: int
    total_cost_usd: float


def initial_state(
    session_id: str,
    company_name: str,
    website: str,
    objective: str,
) -> ResearchState:
    return ResearchState(
        session_id=session_id,
        company_name=company_name,
        website=website,
        objective=objective,
        research_plan={},
        raw_research=[],
        business_signals={},
        quality_score=0.0,
        quality_issues=[],
        retry_count=0,
        report={},
        node_outputs={},
        errors=[],
        status="running",
        total_tokens=0,
        total_cost_usd=0.0,
    )
