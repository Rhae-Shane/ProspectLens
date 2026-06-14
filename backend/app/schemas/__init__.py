from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl


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
