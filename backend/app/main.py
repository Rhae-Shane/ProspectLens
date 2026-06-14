from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import chat, sessions, workflow
from app.cache.context_cache import context_cache
from app.config import get_settings
from app.database import Base, engine
from app.logging_config import configure_logging, get_logger
from app.schemas import HealthResponse

settings = get_settings()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    await context_cache.connect()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    logger.info("application_started")
    yield
    await context_cache.disconnect()
    await engine.dispose()
    logger.info("application_stopped")


app = FastAPI(
    title="ProspectLens API",
    description="AI Research Copilot for Sales Meeting Preparation",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions.router, prefix="/api/v1")
app.include_router(workflow.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(status="healthy")
