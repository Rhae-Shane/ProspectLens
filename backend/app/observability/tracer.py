"""LangSmith tracing configuration."""

import os

from app.logging_config import get_logger

logger = get_logger(__name__)


def _tracing_enabled(value: str) -> bool:
    return value.lower() in {"true", "1", "yes"}


def configure_tracing() -> None:
    from app.config import get_settings

    settings = get_settings()
    if not _tracing_enabled(settings.langsmith_tracing):
        logger.info("langsmith_tracing_disabled")
        return

    os.environ["LANGSMITH_TRACING"] = "true"
    os.environ["LANGCHAIN_TRACING_V2"] = "true"

    if settings.langsmith_api_key:
        os.environ["LANGSMITH_API_KEY"] = settings.langsmith_api_key
        os.environ["LANGCHAIN_API_KEY"] = settings.langsmith_api_key

    if settings.langsmith_endpoint:
        os.environ["LANGSMITH_ENDPOINT"] = settings.langsmith_endpoint

    os.environ["LANGSMITH_PROJECT"] = settings.langsmith_project
    os.environ["LANGCHAIN_PROJECT"] = settings.langsmith_project

    logger.info("langsmith_tracing_enabled", project=settings.langsmith_project)
