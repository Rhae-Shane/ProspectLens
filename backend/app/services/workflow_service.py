import asyncio
import json
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache.context_cache import context_cache
from app.database import async_session_factory
from app.graph.graph import compile_graph
from app.graph.state import initial_state
from app.logging_config import get_logger
from app.models import ResearchSession, WorkflowEvent, WorkflowStatus
from app.observability.events import event_emitter
from app.services.session_service import SessionService

logger = get_logger(__name__)

NODE_ORDER = ["planner", "research", "analyze", "quality_check", "recovery", "report_generator"]

_running_tasks: dict[str, asyncio.Task] = {}


class WorkflowService:
    def __init__(self) -> None:
        self._graph = None

    def get_graph(self):
        if self._graph is None:
            self._graph = compile_graph()
        return self._graph

    async def run_workflow(self, session_id: UUID) -> None:
        async with async_session_factory() as db:
            session = await SessionService.get(db, session_id)
            if not session:
                logger.error("session_not_found", session_id=str(session_id))
                return

            session.status = WorkflowStatus.RUNNING
            session.workflow_status = "running"
            session.error_message = None
            await db.commit()

        try:
            state = initial_state(
                session_id=str(session_id),
                company_name=session.company_name,
                website=session.website,
                objective=session.objective,
            )

            graph = self.get_graph()
            final_state = None

            async with async_session_factory() as db:
                await event_emitter.emit(
                    db, session_id, "workflow", "started", {"company": session.company_name}
                )
                await db.commit()

            # Stream through graph nodes manually to emit events per node
            current_state = dict(state)
            for node_name in ["planner", "research", "analyze", "quality_check"]:
                current_state = await self._run_node_with_events(session_id, node_name, current_state)

            # Conditional routing loop
            while True:
                from app.graph.nodes.quality import route_after_quality

                route = route_after_quality(current_state)
                if route == "recovery":
                    current_state = await self._run_node_with_events(session_id, "recovery", current_state)
                    current_state = await self._run_node_with_events(session_id, "research", current_state)
                    current_state = await self._run_node_with_events(session_id, "analyze", current_state)
                    current_state = await self._run_node_with_events(session_id, "quality_check", current_state)
                else:
                    break

            current_state = await self._run_node_with_events(
                session_id, "report_generator", current_state
            )
            final_state = current_state

            async with async_session_factory() as db:
                session = await SessionService.get(db, session_id)
                if session and final_state:
                    report = final_state.get("report", {})
                    if report:
                        await SessionService.save_report(db, session_id, report)
                        context = self._build_report_context(report)
                        await context_cache.set_report_context(str(session_id), context)

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

    async def _run_node_with_events(
        self, session_id: UUID, node_name: str, state: dict
    ) -> dict:
        from app.graph.nodes import (
            analyze_node,
            planner_node,
            quality_check_node,
            recovery_node,
            report_generator_node,
            research_node,
        )

        node_map = {
            "planner": planner_node,
            "research": research_node,
            "analyze": analyze_node,
            "quality_check": quality_check_node,
            "recovery": recovery_node,
            "report_generator": report_generator_node,
        }

        import time

        start = time.time()
        async with async_session_factory() as db:
            await event_emitter.emit(db, session_id, node_name, "started", {})
            await db.commit()

        try:
            node_fn = node_map[node_name]
            updates = await node_fn(state)
            merged = {**state, **updates}
            duration_ms = int((time.time() - start) * 1000)

            async with async_session_factory() as db:
                await event_emitter.emit(
                    db,
                    session_id,
                    node_name,
                    "completed",
                    {"node_outputs": merged.get("node_outputs", {}).get(node_name, {})},
                    tokens=updates.get("total_tokens", 0) - state.get("total_tokens", 0),
                    cost_usd=updates.get("total_cost_usd", 0.0) - state.get("total_cost_usd", 0.0),
                    duration_ms=duration_ms,
                )
                await context_cache.set_node_output(
                    str(session_id), node_name, merged.get("node_outputs", {}).get(node_name, {})
                )
                await db.commit()

            return merged
        except Exception as e:
            duration_ms = int((time.time() - start) * 1000)
            async with async_session_factory() as db:
                await event_emitter.emit(
                    db, session_id, node_name, "failed", {"error": str(e)}, duration_ms=duration_ms
                )
                await db.commit()
            raise

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

    async def start_background(self, session_id: UUID) -> None:
        sid = str(session_id)
        if sid in _running_tasks and not _running_tasks[sid].done():
            return
        task = asyncio.create_task(self.run_workflow(session_id))
        _running_tasks[sid] = task

    async def retry(self, session_id: UUID) -> None:
        await self.start_background(session_id)

    @staticmethod
    async def get_events(db: AsyncSession, session_id: UUID) -> list[WorkflowEvent]:
        result = await db.execute(
            select(WorkflowEvent)
            .where(WorkflowEvent.session_id == session_id)
            .order_by(WorkflowEvent.created_at)
        )
        return list(result.scalars().all())


workflow_service = WorkflowService()
