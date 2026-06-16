# Engineering Decisions

## Decision 1: OpenAI + Perplexity Dual-Provider Architecture (Extended)

**Choice**: OpenAI GPT-4o for orchestration, analysis, QC, report generation, and chat; Perplexity for primary web research with citations. Additional providers plug in at the Research node and chat tool layer.

**Current providers**:

| Provider | Workflow | Chat tools |
|----------|----------|------------|
| Perplexity | Primary research | `deep_research` |
| Firecrawl | Site map/scrape/crawl | `scrape_website` |
| Apollo | Firmographics | `company_enrichment` |
| Tavily | Supplemental search | `web_search` |
| NewsAPI | News articles | `recent_news` |
| ProductHunt | Product signals | — |

**Alternatives considered**:

- OpenAI-only with Tavily search tool — weaker citation quality, single point of failure
- Perplexity-only — weaker structured JSON and graph routing
- Single LLM with RAG over scraped pages — high infra cost and latency

**Tradeoffs**: Multiple API keys and billing accounts. Provider abstraction and parallel fan-out add complexity. Benefit: richer evidence, Apollo firmographics for snapshot fields, and targeted chat tools without re-running the full workflow.

## Decision 2: Native LangGraph Execution with Observable Node Wrappers

**Choice (updated):** Execute the workflow via `graph.astream(stream_mode="updates")` in `workflow_service.py`. Each node is wrapped with `observable_node()` in `graph/observability.py` to emit SSE/DB events and cache node outputs — preserving observability without manual traversal.

**Previous approach:** Manual sequential node calls duplicated graph routing in `workflow_service.py` (removed in Phase 1).

**Alternatives considered**:

- Pure `graph.ainvoke()` without wrappers — simpler but loses per-node SSE events
- Manual orchestration — full event control but duplicates `graph.py` routing
- Celery task queue — over-engineered for current scope

**Tradeoffs**: Wrappers add a thin layer around each node. Benefit: single source of truth for routing in `graph.py`, native LangGraph execution for assignment compliance, and unchanged frontend SSE contract.

## Decision 3: Redis Context Cache with In-Memory Fallback

**Choice**: Application-level Redis caching for research results and chat context strings, with dict-based fallback when Redis is unavailable.

**Alternatives considered**:

- PostgreSQL-only caching — slower, no TTL semantics
- No caching — higher API costs on retries and duplicate sessions

**Tradeoffs**: TTL-based invalidation only (no event-driven invalidation). Benefit: cost reduction on duplicate research and fast chat bootstrap.

**Note**: Semantic report retrieval moved to PostgreSQL pgvector (Decision 5). Redis is no longer used as a vector store.

## Decision 4: SSE over WebSocket for Progress Streaming

**Choice**: Server-Sent Events via `sse-starlette` for workflow progress.

**Alternatives**: WebSocket (bidirectional but overkill), polling (higher latency).

**Tradeoffs**: SSE is unidirectional; reconnect on timeout handled with ping events. Simpler than WebSocket for this use case.

## Decision 5: pgvector for Report RAG (replacing Redis flat index)

**Choice**: Store report chunk embeddings in PostgreSQL `report_rag_chunks` with the `vector` extension; index on workflow completion; retrieve via cosine distance at chat time.

**Alternatives considered**:

- Redis JSON flat index — no native vector ops, poor scale
- Dedicated vector DB (Pinecone, Qdrant) — extra service for current scale
- Full-context injection only — exceeds token limits on large reports

**Tradeoffs**: Requires pgvector-enabled Postgres (`pgvector/pgvector:pg16` in Docker). Embedding API cost on each report index. Benefit: durable, queryable RAG co-located with report data; standard SQL migrations; no separate vector service.

**Implementation**: `report_rag.py`, `ReportRagChunk` model, OpenAI `text-embedding-3-small`, `search_report` chat tool.

## Decision 6: Hybrid Quality Check (Deterministic + LLM)

**Choice**: Blend deterministic `section_coverage` checks with an LLM quality score. Recovery queries target only uncovered gaps on retry.

**Alternatives considered**:

- LLM-only QC — inconsistent, expensive
- Deterministic-only — misses nuance and citation quality

**Tradeoffs**: More state fields and recovery logic. Benefit: fewer full re-research loops and better report completeness.

## Decision 7: Multi-Call Report Pipeline with Deterministic Extractors

**Choice**: Report Generator runs a pipeline of parallel LLM section calls plus deterministic extractors (Apollo firmographics, regex snapshot fields, source parsing) merged before normalization.

**Alternatives considered**:

- Single monolithic LLM call for entire report — token limits, weaker per-section quality
- Template-only reports without LLM — not flexible enough for varied companies

**Tradeoffs**: Higher orchestration code in `report_pipeline/`. Benefit: richer dashboard `*_overview` blocks and reliable firmographics even when prose research is thin.

## Decision 8: Print-HTML PDF Export (client-side)

**Choice**: Export PDF by opening a styled HTML document and invoking the browser print dialog (Save as PDF).

**Alternatives considered**:

- Server-side PDF (WeasyPrint, Puppeteer) — extra dependency and deploy complexity
- Third-party PDF API — cost and latency

**Tradeoffs**: Formatting depends on browser print engine. Benefit: zero backend changes, works in dev and production immediately.

## Decision 9: LangGraph Postgres Checkpointer

**Choice**: `AsyncPostgresSaver` from `langgraph-checkpoint-postgres`, initialized in FastAPI lifespan; `thread_id = session_id`.

**Alternatives considered**:

- In-memory checkpointer — no crash recovery across restarts
- Redis checkpointer — extra infra; Postgres already required for sessions/RAG

**Tradeoffs**: LangGraph creates its own checkpoint tables on `setup()`. Benefit: mid-run failures leave a resumable checkpoint; `POST /resume` continues from the last completed node without re-running planner/research. `POST /run` and `POST /retry` clear the thread and start fresh.

## Top Technical Debt

1. Alembic migrations not copied into production Docker image — `create_all` used on startup in dev
2. Report schema validation is lenient — malformed LLM output could partially fail
3. JWT auth added but sessions are not user-scoped; no rate limiting on APIs
4. Chat history truncation is hardcoded to last 6 messages
5. Existing sessions do not auto-reindex RAG when report schema changes without re-run

## Biggest Technical Risk

**LLM output reliability**: JSON parsing failures from OpenAI responses could crash workflow nodes. Mitigated by JSON extraction fallback and `report_validation` node, but not full schema repair.

## With 2 Additional Weeks

1. ~~Wire LangGraph Postgres checkpointer for true crash recovery~~ (done — Phase 2)
2. Add integration tests with mocked providers
3. Implement streaming chat responses (SSE tokens)
4. Add user authentication and session ownership
5. Build admin dashboard for cost monitoring and workflow analytics
6. Server-side PDF generation for consistent branding
