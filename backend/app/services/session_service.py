import uuid
from typing import Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Report, ResearchSession, WorkflowStatus
from app.schemas import ReportContent, SessionCreate, SessionResponse


class SessionService:
    @staticmethod
    async def create(db: AsyncSession, data: SessionCreate) -> ResearchSession:
        session = ResearchSession(
            id=uuid.uuid4(),
            company_name=data.company_name,
            website=data.website,
            objective=data.objective,
            status=WorkflowStatus.PENDING,
            workflow_status="pending",
        )
        db.add(session)
        await db.flush()
        return session

    @staticmethod
    async def get(db: AsyncSession, session_id: UUID) -> Optional[ResearchSession]:
        result = await db.execute(
            select(ResearchSession)
            .options(selectinload(ResearchSession.report))
            .where(ResearchSession.id == session_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def list_sessions(
        db: AsyncSession, page: int = 1, page_size: int = 20
    ) -> tuple[list[ResearchSession], int]:
        offset = (page - 1) * page_size
        count_result = await db.execute(select(func.count()).select_from(ResearchSession))
        total = count_result.scalar() or 0

        result = await db.execute(
            select(ResearchSession)
            .options(selectinload(ResearchSession.report))
            .order_by(ResearchSession.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        return list(result.scalars().all()), total

    @staticmethod
    def to_response(session: ResearchSession) -> SessionResponse:
        report = None
        if session.report:
            report = ReportContent(**session.report.content)
        return SessionResponse(
            id=session.id,
            company_name=session.company_name,
            website=session.website,
            objective=session.objective,
            status=session.status.value,
            workflow_status=session.workflow_status,
            total_tokens=session.total_tokens,
            total_cost_usd=session.total_cost_usd,
            error_message=session.error_message,
            created_at=session.created_at,
            updated_at=session.updated_at,
            report=report,
        )

    @staticmethod
    async def save_report(db: AsyncSession, session_id: UUID, content: dict) -> Report:
        existing = await db.execute(select(Report).where(Report.session_id == session_id))
        report = existing.scalar_one_or_none()
        if report:
            report.content = content
        else:
            report = Report(id=uuid.uuid4(), session_id=session_id, content=content)
            db.add(report)
        await db.flush()
        return report
