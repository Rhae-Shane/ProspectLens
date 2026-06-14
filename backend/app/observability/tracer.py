"""LangSmith tracing configuration."""

from app.logging_config import get_logger

logger = get_logger(__name__)


def configure_tracing() -> None:
    from app.config import get_settings

    settings = get_settings()
    if settings.langchain_tracing_v2.lower() == "true":
        logger.info("langsmith_tracing_enabled", project=settings.langchain_project)
    else:
        logger.info("langsmith_tracing_disabled")
