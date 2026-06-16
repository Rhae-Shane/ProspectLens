"""LangGraph Postgres checkpointer lifecycle."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from app.config import get_settings
from app.logging_config import get_logger

logger = get_logger(__name__)


@asynccontextmanager
async def postgres_checkpointer() -> AsyncIterator:
    """Create and tear down AsyncPostgresSaver for app lifespan."""
    from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

    settings = get_settings()
    async with AsyncPostgresSaver.from_conn_string(settings.database_url_sync) as checkpointer:
        await checkpointer.setup()
        logger.info("langgraph_checkpointer_ready")
        yield checkpointer
