import asyncio
import json
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from app.database import get_db
from app.models import WorkflowStatus
from app.observability.events import event_emitter
from app.schemas import WorkflowCheckpointResponse, WorkflowEventResponse, WorkflowRunResponse
from app.services.session_service import SessionService
from app.services.workflow_service import workflow_service

router = APIRouter(prefix="/sessions", tags=["workflow"])


def _ensure_not_running(session) -> None:
    if session.status == WorkflowStatus.RUNNING:
        raise HTTPException(status_code=409, detail="Workflow already running")


@router.post("/{session_id}/run", response_model=WorkflowRunResponse)
async def run_workflow(session_id: UUID, db: AsyncSession = Depends(get_db)):
    session = await SessionService.get(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    _ensure_not_running(session)

    session.status = WorkflowStatus.RUNNING
    session.workflow_status = "running"
    await db.flush()

    await workflow_service.start_background(session_id, mode="fresh")
    return WorkflowRunResponse(
        session_id=session_id,
        status="running",
        message="Workflow started",
    )


@router.post("/{session_id}/retry", response_model=WorkflowRunResponse)
async def retry_workflow(session_id: UUID, db: AsyncSession = Depends(get_db)):
    session = await SessionService.get(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    _ensure_not_running(session)

    session.status = WorkflowStatus.RUNNING
    session.workflow_status = "running"
    session.error_message = None
    await db.flush()

    await workflow_service.retry(session_id)
    return WorkflowRunResponse(
        session_id=session_id,
        status="running",
        message="Workflow retry started (full restart)",
    )


@router.post("/{session_id}/resume", response_model=WorkflowRunResponse)
async def resume_workflow(session_id: UUID, db: AsyncSession = Depends(get_db)):
    session = await SessionService.get(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    _ensure_not_running(session)

    checkpoint = await workflow_service.get_checkpoint_status(session_id)
    if not checkpoint:
        raise HTTPException(status_code=404, detail="No checkpoint found for this session")

    if session.status == WorkflowStatus.COMPLETED and not checkpoint["can_resume"]:
        raise HTTPException(status_code=409, detail="Workflow already completed")

    session.status = WorkflowStatus.RUNNING
    session.workflow_status = "running"
    session.error_message = None
    await db.flush()

    await workflow_service.resume(session_id)
    return WorkflowRunResponse(
        session_id=session_id,
        status="running",
        message="Workflow resumed from checkpoint",
    )


@router.get("/{session_id}/workflow/state", response_model=WorkflowCheckpointResponse)
async def get_workflow_state(session_id: UUID, db: AsyncSession = Depends(get_db)):
    session = await SessionService.get(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    checkpoint = await workflow_service.get_checkpoint_status(session_id)
    if not checkpoint:
        return WorkflowCheckpointResponse(
            session_id=session_id,
            has_checkpoint=False,
            can_resume=False,
        )

    return WorkflowCheckpointResponse(
        session_id=session_id,
        has_checkpoint=True,
        can_resume=checkpoint["can_resume"],
        next_nodes=checkpoint["next_nodes"],
        checkpoint_id=checkpoint.get("checkpoint_id"),
    )


@router.get("/{session_id}/events", response_model=list[WorkflowEventResponse])
async def get_events(session_id: UUID, db: AsyncSession = Depends(get_db)):
    session = await SessionService.get(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    events = await workflow_service.get_events(db, session_id)
    return [WorkflowEventResponse.model_validate(e) for e in events]


@router.get("/{session_id}/events/stream")
async def stream_events(session_id: UUID, db: AsyncSession = Depends(get_db)):
    session = await SessionService.get(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    async def event_generator():
        queue = event_emitter.subscribe(str(session_id))
        try:
            existing = await workflow_service.get_events(db, session_id)
            for event in existing:
                yield {
                    "event": "workflow_event",
                    "data": json.dumps(
                        WorkflowEventResponse.model_validate(event).model_dump(mode="json")
                    ),
                }

            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield {"event": "workflow_event", "data": json.dumps(event)}
                    if event.get("event_type") in ("completed", "failed") and event.get("node") == "workflow":
                        break
                except asyncio.TimeoutError:
                    yield {"event": "ping", "data": "{}"}
        finally:
            event_emitter.unsubscribe(str(session_id), queue)

    return EventSourceResponse(event_generator())
