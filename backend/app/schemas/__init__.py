from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl


def _coerce_report_text(value: Any) -> str:
    if isinstance(value, str):
        return value
    if value is None:
        return ""
    if isinstance(value, list):
        lines: list[str] = []
        for item in value:
            if isinstance(item, dict):
                parts = [str(v) for v in item.values() if v]
                lines.append("- " + (": ".join(parts) if parts else str(item)))
            else:
                lines.append(f"- {item}")
        return "\n".join(lines)
    return str(value)


def normalize_report_content(content: dict[str, Any]) -> dict[str, Any]:
    """Coerce LLM output into the shape expected by ReportContent."""
    normalized = dict(content)
    for key in (
        "company_overview",
        "products_services",
        "target_customers",
        "business_signals",
        "risks_challenges",
        "outreach_strategy",
    ):
        if key in normalized:
            normalized[key] = _coerce_report_text(normalized[key])
    for key in ("discovery_questions", "unknowns"):
        if key not in normalized:
            continue
        value = normalized[key]
        if isinstance(value, list):
            normalized[key] = [str(item) for item in value]
        elif isinstance(value, str):
            normalized[key] = [value] if value else []
        else:
            normalized[key] = [str(value)]
    return normalized


class SourceItem(BaseModel):
    title: str
    url: str
    snippet: str = ""


class ReportContent(BaseModel):
    company_overview: str
    products_services: str
    target_customers: str
    business_signals: str
    risks_challenges: str
    discovery_questions: list[str]
    outreach_strategy: str
    unknowns: list[str]
    sources: list[SourceItem]


class SessionCreate(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=255)
    website: str = Field(..., min_length=1, max_length=512)
    objective: str = Field(..., min_length=10)


class SessionResponse(BaseModel):
    id: UUID
    company_name: str
    website: str
    objective: str
    status: str
    workflow_status: str
    total_tokens: int
    total_cost_usd: float
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    report: Optional[ReportContent] = None

    model_config = {"from_attributes": True}


class SessionListResponse(BaseModel):
    items: list[SessionResponse]
    total: int
    page: int
    page_size: int


class ChatMessageCreate(BaseModel):
    message: str = Field(..., min_length=1)


class ChatMessageResponse(BaseModel):
    id: UUID
    role: str
    content: str
    tokens: int
    created_at: datetime

    model_config = {"from_attributes": True}


class WorkflowEventResponse(BaseModel):
    id: UUID
    node: str
    event_type: str
    payload: dict[str, Any]
    tokens: int
    cost_usd: float
    duration_ms: int
    created_at: datetime

    model_config = {"from_attributes": True}


class WorkflowRunResponse(BaseModel):
    session_id: UUID
    status: str
    message: str


class HealthResponse(BaseModel):
    status: str
    version: str = "0.1.0"
