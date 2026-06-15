from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    openai_api_key: str = ""
    perplexity_api_key: str = ""
    tavily_api_key: str = ""
    newapiorg_api_key: str = ""
    firecrawl_api_key: str = ""
    producthunt_developer_token: str = ""
    producthunt_api_key: str = ""
    producthunt_api_secret: str = ""
    apollo_api_key: str = ""
    database_url: str = "postgresql+asyncpg://prospectlens:prospectlens@localhost:5432/prospectlens"
    redis_url: str = "redis://localhost:6379/0"
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    openai_model: str = "gpt-4o"
    perplexity_model: str = "sonar-pro"
    log_level: str = "INFO"
    langsmith_tracing: str = "false"
    langsmith_endpoint: str = ""
    langsmith_api_key: str = ""
    langsmith_project: str = "prospectlens"
    quality_threshold: float = 0.75
    max_retries: int = 2
    research_cache_ttl: int = 86400
    report_context_ttl: int = 604800
    openai_monthly_budget_usd: float = 5.0
    tavily_monthly_budget_usd: float = 5.0
    perplexity_monthly_budget_usd: float = 5.0
    newsapi_monthly_budget_usd: float = 0.0
    firecrawl_monthly_budget_usd: float = 5.0
    apollo_monthly_budget_usd: float = 5.0
    producthunt_monthly_budget_usd: float = 0.0

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
