import json
import os
from typing import Any

import httpx
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from app.config import get_settings

settings = get_settings()

# Enable LangSmith tracing when configured
if settings.langchain_tracing_v2.lower() == "true":
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    if settings.langchain_api_key:
        os.environ["LANGCHAIN_API_KEY"] = settings.langchain_api_key
    os.environ["LANGCHAIN_PROJECT"] = settings.langchain_project


class OpenAIClient:
    """OpenAI client for structured LLM calls."""

    def __init__(self) -> None:
        self.model = ChatOpenAI(
            model=settings.openai_model,
            api_key=settings.openai_api_key or "sk-placeholder",
            temperature=0.2,
        )
        # Pricing per 1M tokens (approximate for gpt-4o)
        self.input_cost_per_m = 2.50
        self.output_cost_per_m = 10.00

    def estimate_cost(self, input_tokens: int, output_tokens: int) -> float:
        return (input_tokens / 1_000_000 * self.input_cost_per_m) + (
            output_tokens / 1_000_000 * self.output_cost_per_m
        )

    async def complete_json(
        self,
        system_prompt: str,
        user_prompt: str,
    ) -> tuple[dict[str, Any], int, float]:
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]
        response = await self.model.ainvoke(messages)
        content = response.content
        if isinstance(content, list):
            content = "".join(str(c) for c in content)

        usage = response.usage_metadata or {}
        input_tokens = usage.get("input_tokens", 0)
        output_tokens = usage.get("output_tokens", 0)
        total_tokens = input_tokens + output_tokens
        cost = self.estimate_cost(input_tokens, output_tokens)

        # Parse JSON from response
        text = str(content).strip()
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                parsed = json.loads(text[start:end])
            else:
                raise ValueError(f"Failed to parse JSON from LLM response: {text[:200]}")

        return parsed, total_tokens, cost

    async def complete_text(
        self,
        system_prompt: str,
        user_prompt: str,
    ) -> tuple[str, int, float]:
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]
        response = await self.model.ainvoke(messages)
        content = response.content
        if isinstance(content, list):
            content = "".join(str(c) for c in content)

        usage = response.usage_metadata or {}
        input_tokens = usage.get("input_tokens", 0)
        output_tokens = usage.get("output_tokens", 0)
        total_tokens = input_tokens + output_tokens
        cost = self.estimate_cost(input_tokens, output_tokens)
        return str(content), total_tokens, cost


class PerplexityClient:
    """Perplexity API client for web research with citations."""

    BASE_URL = "https://api.perplexity.ai/chat/completions"

    def __init__(self) -> None:
        self.api_key = settings.perplexity_api_key
        self.model = settings.perplexity_model
        self.cost_per_request = 0.005  # approximate

    async def research(self, query: str, context: str = "") -> tuple[dict[str, Any], int, float]:
        if not self.api_key:
            return self._mock_research(query, context)

        system = (
            "You are a business research analyst. Provide factual, well-sourced information. "
            "Include specific data points, recent news, and cite sources."
        )
        user = f"Context: {context}\n\nResearch query: {query}" if context else query

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                self.BASE_URL,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    "temperature": 0.1,
                    "return_citations": True,
                },
            )
            response.raise_for_status()
            data = response.json()

        content = data["choices"][0]["message"]["content"]
        citations = data.get("citations", [])

        sources = []
        for i, url in enumerate(citations):
            sources.append({"title": f"Source {i + 1}", "url": url, "snippet": ""})

        result = {
            "query": query,
            "content": content,
            "sources": sources,
        }
        tokens = data.get("usage", {}).get("total_tokens", 500)
        return result, tokens, self.cost_per_request

    def _mock_research(self, query: str, context: str) -> tuple[dict[str, Any], int, float]:
        """Fallback when no Perplexity key — uses structured placeholder."""
        company = context.split("Company:")[-1].split("\n")[0].strip() if "Company:" in context else "the company"
        return {
            "query": query,
            "content": (
                f"Research findings for {company} regarding: {query}. "
                f"This is simulated research data. Configure PERPLEXITY_API_KEY for live web research."
            ),
            "sources": [
                {
                    "title": f"{company} Official Website",
                    "url": "https://example.com",
                    "snippet": "Company overview and product information.",
                }
            ],
        }, 500, 0.0


openai_client = OpenAIClient()
perplexity_client = PerplexityClient()
