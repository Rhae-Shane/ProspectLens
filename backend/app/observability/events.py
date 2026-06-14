import time
import uuid
from typing import Any, Callable, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.logging_config import get_logger
from app.models import WorkflowEvent

logger = get_logger(__name__)


class WorkflowEventEmitter:
    """Persists workflow events and supports SSE subscribers."""

    def __init__(self) -> None:
        self._subscribers: dict[str, list] = {}

    def subscribe(self, session_id: str):
        import asyncio
        queue: asyncio.Queue = asyncio.Queue()
        self._subscribers.setdefault(session_id, []).append(queue)
        return queue

    def unsubscribe(self, session_id: str, queue) -> None:
        if session_id in self._subscribers:
            self._subscribers[session_id] = [q for q in self._subscribers[session_id] if q != queue]
            if not self._subscribers[session_id]:
                del self._subscribers[session_id]

    async def _notify(self, session_id: str, event: dict) -> None:
        for queue in self._subscribers.get(session_id, []):
            await queue.put(event)

    async def emit(
        self,
        db: AsyncSession,
        session_id: UUID,
        node: str,
        event_type: str,
        payload: dict[str, Any],
        tokens: int = 0,
        cost_usd: float = 0.0,
        duration_ms: int = 0,
    ) -> WorkflowEvent:
        event = WorkflowEvent(
            id=uuid.uuid4(),
            session_id=session_id,
            node=node,
            event_type=event_type,
            payload=payload,
            tokens=tokens,
            cost_usd=cost_usd,
            duration_ms=duration_ms,
        )
        db.add(event)
        await db.flush()

        sse_payload = {
            "id": str(event.id),
            "node": node,
            "event_type": event_type,
            "payload": payload,
            "tokens": tokens,
            "cost_usd": cost_usd,
            "duration_ms": duration_ms,
            "created_at": event.created_at.isoformat() if event.created_at else None,
        }
        await self._notify(str(session_id), sse_payload)
        logger.info(
            "workflow_event",
            session_id=str(session_id),
            node=node,
            event_type=event_type,
            tokens=tokens,
            duration_ms=duration_ms,
        )
        return event


event_emitter = WorkflowEventEmitter()


async def track_node(
    db: AsyncSession,
    session_id: UUID,
    node: str,
    fn: Callable,
    *args,
    **kwargs,
) -> Any:
    """Wrap a node function with timing and event emission."""
    start = time.time()
    await event_emitter.emit(db, session_id, node, "started", {})
    try:
        result, tokens, cost = await fn(*args, **kwargs)
        duration_ms = int((time.time() - start) * 1000)
        await event_emitter.emit(
            db,
            session_id,
            node,
            "completed",
            {"output_keys": list(result.keys()) if isinstance(result, dict) else []},
            tokens=tokens,
            cost_usd=cost,
            duration_ms=duration_ms,
        )
        return result, tokens, cost
    except Exception as e:
        duration_ms = int((time.time() - start) * 1000)
        await event_emitter.emit(
            db,
            session_id,
            node,
            "failed",
            {"error": str(e)},
            duration_ms=duration_ms,
        )
        raise


class CostTracker:
    @staticmethod
    def accumulate(state: dict, tokens: int, cost: float) -> dict:
        return {
            "total_tokens": state.get("total_tokens", 0) + tokens,
            "total_cost_usd": state.get("total_cost_usd", 0.0) + cost,
        }
