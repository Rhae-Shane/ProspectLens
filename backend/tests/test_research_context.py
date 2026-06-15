from app.graph.research_context import compact_research_items, serialize_research_for_llm


def test_serialize_research_truncates_large_payload():
    huge = [
        {
            "query": f"query {i}",
            "provider": "firecrawl",
            "content": "x" * 15000,
            "sources": [{"title": "t", "url": f"https://example.com/{i}", "snippet": "s" * 500}],
        }
        for i in range(20)
    ]
    serialized = serialize_research_for_llm(huge, max_total_chars=28000)
    assert len(serialized) <= 28000
    assert "[truncated for analysis]" in serialized or len(huge) > 0


def test_compact_research_items_limits_content():
    items = compact_research_items(
        [{"query": "q", "provider": "tavily", "content": "a" * 5000, "sources": []}],
        max_content_chars=1000,
    )
    assert len(items[0]["content"]) <= 1000 + len("\n...[truncated for analysis]")
