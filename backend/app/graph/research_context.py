import json
from typing import Any


def compact_research_items(
    raw_research: list[dict[str, Any]],
    *,
    max_content_chars: int = 2000,
    max_sources: int = 3,
    max_snippet_chars: int = 150,
) -> list[dict[str, Any]]:
    compacted: list[dict[str, Any]] = []
    for item in raw_research:
        sources = item.get("sources", [])[:max_sources]
        compact_sources = [
            {
                "title": source.get("title", ""),
                "url": source.get("url", ""),
                "snippet": str(source.get("snippet", ""))[:max_snippet_chars],
            }
            for source in sources
            if isinstance(source, dict)
        ]
        content = str(item.get("content", ""))
        if len(content) > max_content_chars:
            content = content[:max_content_chars] + "\n...[truncated for analysis]"

        compacted.append(
            {
                "query": item.get("query", ""),
                "provider": item.get("provider", ""),
                "content": content,
                "sources": compact_sources,
            }
        )
    return compacted


def serialize_research_for_llm(
    raw_research: list[dict[str, Any]],
    *,
    max_total_chars: int = 28000,
    max_content_chars: int = 2000,
) -> str:
    """Shrink research payload to stay within OpenAI TPM limits."""
    content_limit = max_content_chars
    while content_limit >= 400:
        compacted = compact_research_items(raw_research, max_content_chars=content_limit)
        text = json.dumps(compacted, indent=2)
        if len(text) <= max_total_chars:
            return text
        content_limit //= 2

    return json.dumps(compact_research_items(raw_research, max_content_chars=400), indent=2)[
        :max_total_chars
    ]
