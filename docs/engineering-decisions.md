# Engineering Decisions

## Decision 1: OpenAI + Perplexity Dual-Provider Architecture

**Choice**: OpenAI GPT-4o for orchestration/analysis/report generation; Perplexity API for web research with citations.

**Alternatives Considered**:
- OpenAI-only with Tavily search tool — adds complexity, weaker citation quality
- Perplexity-only — weaker structured JSON output and graph routing reliability
- Single LLM with RAG over scraped pages — high infrastructure cost, latency

**Tradeoffs**: Two API keys and billing accounts to manage. Provider abstraction layer adds code. Benefit: real cited sources (Perplexity) + reliable structured outputs (OpenAI).

## Decision 2: Manual Node Orchestration with Event Emission vs Pure Graph Invoke

**Choice**: Execute nodes sequentially via workflow service with explicit event emission, while maintaining LangGraph StateGraph definition for structure and routing logic.

**Alternatives Considered**:
- Pure `graph.ainvoke()` — simpler but harder to emit per-node SSE events
- Celery task queue — over-engineered for assignment scope

**Tradeoffs**: Some duplication between graph definition and execution loop. Benefit: full observability with SSE progress, DB events, and retry control.

## Decision 3: Redis Context Cache with In-Memory Fallback

**Choice**: Application-level Redis caching for research results and chat context, with dict-based fallback when Redis is unavailable.

**Alternatives Considered**:
- PostgreSQL-only caching — slower, no TTL semantics
- Anthropic prompt caching — not applicable with OpenAI primary
- No caching — higher API costs on retries and duplicate sessions

**Tradeoffs**: Cache invalidation is TTL-based only (no event-driven invalidation). Benefit: significant cost reduction on duplicate research and fast chat context retrieval.

## Decision 4: SSE over WebSocket for Progress Streaming

**Choice**: Server-Sent Events via `sse-starlette` for workflow progress.

**Alternatives**: WebSocket (bidirectional but overkill), polling (higher latency, more load).

**Tradeoffs**: SSE is unidirectional and may reconnect on timeout (handled with ping events). Simpler than WebSocket for this use case.

## Top Technical Debt

1. Manual node execution duplicates LangGraph graph traversal — should use LangGraph streaming API
2. No Postgres checkpointer wired yet (graph compiles without checkpointer)
3. Report schema validation is lenient — malformed LLM output could fail silently
4. No authentication or rate limiting on APIs
5. Chat history truncation is hardcoded to last 6 messages

## Biggest Technical Risk

**LLM output reliability**: JSON parsing failures from OpenAI responses could crash workflow nodes. Mitigated by JSON extraction fallback but not schema repair.

## With 2 Additional Weeks

1. Wire LangGraph Postgres checkpointer for true crash recovery
2. Add integration tests with mocked providers
3. Implement streaming chat responses
4. Add user authentication and session ownership
5. Build admin dashboard for cost monitoring and workflow analytics
6. Add PDF export of research reports
