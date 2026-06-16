import asyncio
from typing import Any, Literal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache.context_cache import context_cache
from app.database import async_session_factory
from app.graph.graph import compile_graph
from app.graph.state import initial_state
from app.logging_config import get_logger
from app.models import WorkflowEvent, WorkflowStatus
from app.observability.events import event_emitter
from app.services.report_rag import report_rag
from app.services.session_service import SessionService

logger = get_logger(__name__)

_running_tasks: dict[str, asyncio.Task] = {}
RunMode = Literal["fresh", "resume"]


class WorkflowService:
    def __init__(self) -> None:
        self._graph = None
        self._checkpointer = None

    def set_checkpointer(self, checkpointer) -> None:
        self._checkpointer = checkpointer
        self._graph = None

    def get_graph(self):
        if self._graph is None:
            self._graph = compile_graph(self._checkpointer)
        return self._graph

    @staticmethod
    def _graph_config(session_id: UUID) -> dict:
        return {"configurable": {"thread_id": str(session_id)}}

    async def clear_checkpoint(self, session_id: UUID) -> None:
        if self._checkpointer is None:
            return
        await self._checkpointer.adelete_thread(str(session_id))

    async def get_checkpoint_status(self, session_id: UUID) -> dict[str, Any] | None:
        if self._checkpointer is None:
            return None

        graph = self.get_graph()
        config = self._graph_config(session_id)
        snapshot = await graph.aget_state(config)
        if not snapshot or not snapshot.values:
            return None

        return {
            "has_checkpoint": True,
            "next_nodes": list(snapshot.next or ()),
            "can_resume": bool(snapshot.next),
            "checkpoint_id": snapshot.config.get("configurable", {}).get("checkpoint_id"),
        }

    async def run_workflow(self, session_id: UUID, *, mode: RunMode = "fresh") -> None:
        async with async_session_factory() as db:
            session = await SessionService.get(db, session_id)
            if not session:
                logger.error("session_not_found", session_id=str(session_id))
                return

            session.status = WorkflowStatus.RUNNING
            session.workflow_status = "running"
            session.error_message = None
            await db.commit()
            company_name = session.company_name
            website = session.website
            objective = session.objective

        graph = self.get_graph()
        config = self._graph_config(session_id)

        try:
            graph_input: dict | None
            final_state: dict

            if mode == "fresh":
                await self.clear_checkpoint(session_id)
                graph_input = initial_state(
                    session_id=str(session_id),
                    company_name=company_name,
                    website=website,
                    objective=objective,
                )
                final_state = dict(graph_input)
                should_stream = True
            else:
                snapshot = await graph.aget_state(config)
                if not snapshot or not snapshot.values:
                    raise ValueError("No checkpoint found for this session")

                final_state = dict(snapshot.values)
                should_stream = bool(snapshot.next)
                graph_input = None
                if not should_stream:
                    await self._finalize_workflow(session_id, final_state)
                    return

            if mode == "fresh":
                async with async_session_factory() as db:
                    await event_emitter.emit(
                        db, session_id, "workflow", "started", {"company": company_name}
                    )
                    await db.commit()
            else:
                async with async_session_factory() as db:
                    await event_emitter.emit(
                        db,
                        session_id,
                        "workflow",
                        "resumed",
                        {"next_nodes": list((await graph.aget_state(config)).next or ())},
                    )
                    await db.commit()

            if should_stream:
                async for chunk in graph.astream(graph_input, config=config, stream_mode="updates"):
                    for node_name, updates in chunk.items():
                        final_state = {**final_state, **updates}
                        logger.info(
                            "graph_node_completed",
                            session_id=str(session_id),
                            node=node_name,
                        )

                snapshot = await graph.aget_state(config)
                if snapshot and snapshot.values:
                    final_state = dict(snapshot.values)

            await self._finalize_workflow(session_id, final_state)

        except Exception as e:
            logger.error("workflow_failed", session_id=str(session_id), error=str(e))
            async with async_session_factory() as db:
                session = await SessionService.get(db, session_id)
                if session:
                    session.status = WorkflowStatus.FAILED
                    session.workflow_status = "failed"
                    session.error_message = str(e)
                    await event_emitter.emit(
                        db, session_id, "workflow", "failed", {"error": str(e)}
                    )
                await db.commit()
        finally:
            _running_tasks.pop(str(session_id), None)

    async def _finalize_workflow(self, session_id: UUID, final_state: dict) -> None:
        async with async_session_factory() as db:
            session = await SessionService.get(db, session_id)
            if session and final_state:
                report = final_state.get("report", {})
                if report:
                    await SessionService.save_report(db, session_id, report)
                    context = self._build_report_context(report)
                    await context_cache.set_report_context(str(session_id), context)
                    try:
                        chunk_count = await report_rag.index_report(str(session_id), report, db)
                        logger.info(
                            "report_rag_indexed",
                            session_id=str(session_id),
                            chunks=chunk_count,
                        )
                    except Exception as exc:
                        logger.warning(
                            "report_rag_index_failed",
                            session_id=str(session_id),
                            error=str(exc),
                        )

                session.status = WorkflowStatus.COMPLETED
                session.workflow_status = "completed"
                session.total_tokens = final_state.get("total_tokens", 0)
                session.total_cost_usd = final_state.get("total_cost_usd", 0.0)

                await event_emitter.emit(
                    db,
                    session_id,
                    "workflow",
                    "completed",
                    {
                        "total_tokens": session.total_tokens,
                        "total_cost_usd": session.total_cost_usd,
                    },
                )
            await db.commit()

    @staticmethod
    def _build_report_context(report: dict) -> str:
        sections = [
            "company_overview",
            "products_services",
            "target_customers",
            "business_signals",
            "risks_challenges",
            "outreach_strategy",
        ]
        parts = []
        for section in sections:
            val = report.get(section, "")
            if val:
                parts.append(f"## {section.replace('_', ' ').title()}\n{val}")
        questions = report.get("discovery_questions", [])
        if questions:
            parts.append("## Discovery Questions\n" + "\n".join(f"- {q}" for q in questions))
        unknowns = report.get("unknowns", [])
        if unknowns:
            parts.append("## Unknowns\n" + "\n".join(f"- {u}" for u in unknowns))
        return "\n\n".join(parts)

    async def start_background(self, session_id: UUID, *, mode: RunMode = "fresh") -> None:
        sid = str(session_id)
        if sid in _running_tasks and not _running_tasks[sid].done():
            return
        task = asyncio.create_task(self.run_workflow(session_id, mode=mode))
        _running_tasks[sid] = task

    async def retry(self, session_id: UUID) -> None:
        await self.start_background(session_id, mode="fresh")

    async def resume(self, session_id: UUID) -> None:
        await self.start_background(session_id, mode="resume")

    @staticmethod
    async def get_events(db: AsyncSession, session_id: UUID) -> list[WorkflowEvent]:
        result = await db.execute(
            select(WorkflowEvent)
            .where(WorkflowEvent.session_id == session_id)
            .order_by(WorkflowEvent.created_at)
        )
        return list(result.scalars().all())


workflow_service = WorkflowService()
