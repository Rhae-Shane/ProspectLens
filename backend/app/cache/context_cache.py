import hashlib
import json
from typing import Any, Optional

import redis.asyncio as aioredis

from app.config import get_settings
from app.logging_config import get_logger

logger = get_logger(__name__)
settings = get_settings()


class ContextCache:
    """Redis-backed context cache with in-memory fallback."""

    def __init__(self) -> None:
        self._redis: Optional[aioredis.Redis] = None
        self._memory: dict[str, tuple[str, float]] = {}
        self._connected = False

    async def connect(self) -> None:
        try:
            self._redis = aioredis.from_url(settings.redis_url, decode_responses=True)
            await self._redis.ping()
            self._connected = True
            logger.info("redis_connected")
        except Exception as e:
            logger.warning("redis_unavailable_using_memory", error=str(e))
            self._connected = False

    async def disconnect(self) -> None:
        if self._redis:
            await self._redis.close()

    @staticmethod
    def _research_key(company: str, website: str, objective: str) -> str:
        raw = f"{company}|{website}|{objective}".lower()
        return f"research:{hashlib.sha256(raw.encode()).hexdigest()}"

    @staticmethod
    def _report_ctx_key(session_id: str) -> str:
        return f"report_ctx:{session_id}"

    @staticmethod
    def _node_output_key(session_id: str, node: str) -> str:
        return f"node_output:{session_id}:{node}"

    async def get(self, key: str) -> Optional[Any]:
        if self._connected and self._redis:
            val = await self._redis.get(key)
            if val:
                logger.info("cache_hit", key=key)
                return json.loads(val)
            logger.info("cache_miss", key=key)
            return None
        if key in self._memory:
            logger.info("cache_hit_memory", key=key)
            return json.loads(self._memory[key][0])
        logger.info("cache_miss_memory", key=key)
        return None

    async def set(self, key: str, value: Any, ttl: int) -> None:
        serialized = json.dumps(value)
        if self._connected and self._redis:
            await self._redis.setex(key, ttl, serialized)
        else:
            import time
            self._memory[key] = (serialized, time.time() + ttl)

    async def get_research(self, company: str, website: str, objective: str) -> Optional[list]:
        key = self._research_key(company, website, objective)
        return await self.get(key)

    async def set_research(self, company: str, website: str, objective: str, data: list) -> None:
        key = self._research_key(company, website, objective)
        await self.set(key, data, settings.research_cache_ttl)

    async def get_report_context(self, session_id: str) -> Optional[str]:
        key = self._report_ctx_key(session_id)
        val = await self.get(key)
        return val if isinstance(val, str) else None

    async def set_report_context(self, session_id: str, context: str) -> None:
        key = self._report_ctx_key(session_id)
        await self.set(key, context, settings.report_context_ttl)

    async def get_node_output(self, session_id: str, node: str) -> Optional[Any]:
        key = self._node_output_key(session_id, node)
        return await self.get(key)

    async def set_node_output(self, session_id: str, node: str, output: Any) -> None:
        key = self._node_output_key(session_id, node)
        await self.set(key, output, settings.research_cache_ttl)


context_cache = ContextCache()
