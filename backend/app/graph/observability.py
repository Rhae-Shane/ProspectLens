"""LangGraph node wrappers for workflow event emission and caching."""

from __future__ import annotations

import time
from collections.abc import Awaitable, Callable
from typing import Any
from uuid import UUID

from app.cache.context_cache import context_cache
from app.database import async_session_factory
from app.observability.events import event_emitter

NodeFn = Callable[[dict[str, Any]], Awaitable[dict[str, Any]]]


async def emit_node_started(session_id: UUID, node_name: str) -> None:
    async with async_session_factory() as db:
        await event_emitter.emit(db, session_id, node_name, "started", {})
        await db.commit()


async def emit_node_completed(
    session_id: UUID,
    node_name: str,
    state: dict[str, Any],
    updates: dict[str, Any],
    node_output: dict[str, Any],
    duration_ms: int,
) -> None:
    token_delta = updates.get("total_tokens", state.get("total_tokens", 0)) - state.get("total_tokens", 0)
    cost_delta = updates.get("total_cost_usd", state.get("total_cost_usd", 0.0)) - state.get(
        "total_cost_usd", 0.0
    )
    async with async_session_factory() as db:
        await event_emitter.emit(
            db,
            session_id,
            node_name,
            "completed",
            {"node_outputs": node_output},
            tokens=token_delta,
            cost_usd=cost_delta,
            duration_ms=duration_ms,
        )
        await context_cache.set_node_output(str(session_id), node_name, node_output)
        await db.commit()


async def emit_node_failed(
    session_id: UUID,
    node_name: str,
    error: Exception,
    duration_ms: int,
) -> None:
    async with async_session_factory() as db:
        await event_emitter.emit(
            db,
            session_id,
            node_name,
            "failed",
            {"error": str(error)},
            duration_ms=duration_ms,
        )
        await db.commit()


def observable_node(node_name: str, node_fn: NodeFn) -> NodeFn:
    """Wrap a graph node with started/completed/failed workflow events."""

    async def wrapped(state: dict[str, Any]) -> dict[str, Any]:
        raw_session_id = state["session_id"]
        session_id = raw_session_id if isinstance(raw_session_id, UUID) else UUID(str(raw_session_id))
        start = time.perf_counter()
        await emit_node_started(session_id, node_name)
        try:
            updates = await node_fn(state)
            duration_ms = int((time.perf_counter() - start) * 1000)
            merged_outputs = dict(state.get("node_outputs", {}))
            if node_outputs := updates.get("node_outputs"):
                merged_outputs.update(node_outputs)
            await emit_node_completed(
                session_id,
                node_name,
                state,
                updates,
                merged_outputs.get(node_name, {}),
                duration_ms,
            )
            return updates
        except Exception as exc:
            duration_ms = int((time.perf_counter() - start) * 1000)
            await emit_node_failed(session_id, node_name, exc, duration_ms)
            raise

    wrapped.__name__ = node_fn.__name__
    wrapped.__doc__ = node_fn.__doc__
    return wrapped
