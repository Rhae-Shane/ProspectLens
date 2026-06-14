# Architecture

## System Overview

ProspectLens follows a three-tier architecture: React frontend, FastAPI backend, and LangGraph AI workflow layer with PostgreSQL persistence and Redis caching.

## Data Flow

1. User creates a session (company, website, objective) via frontend
2. Frontend triggers POST /sessions/{id}/run
3. Backend starts LangGraph workflow as async background task
4. Each node executes sequentially (with conditional retry loop after QC)
5. Node events persist to workflow_events table and stream via SSE
6. Final report saves to reports table; context cached in Redis for chat
7. User views report and engages in follow-up chat grounded in cached report context

## LangGraph Workflow

### Shared State (ResearchState)

All nodes read/write a shared TypedDict containing session metadata, intermediate outputs, quality scores, and accumulated token/cost metrics.

### Nodes

| Node | Provider | Input | Output |
|------|----------|-------|--------|
| Planner | OpenAI | Company + objective | Research plan with queries |
| Research | Perplexity | Plan queries | Raw research + sources |
| Analyze | OpenAI | Raw research | Structured business analysis |
| Quality Check | OpenAI | Research + analysis | Quality score + issues |
| Recovery | OpenAI | Quality issues | Additional queries (conditional) |
| Report Generator | OpenAI | All prior outputs | 9-section JSON report |

### Conditional Routing

After Quality Check, if quality_score >= 0.75 OR retry_count >= 2, route to Report Generator. Otherwise route to Recovery then Research retry loop.

## Observability Harness

- LangSmith: Automatic tracing when LANGCHAIN_TRACING_V2=true
- Workflow Events DB: Every node transition persisted with tokens, cost, duration
- SSE Stream: Real-time event delivery to frontend progress UI
- Structured Logging: JSON logs via structlog with session/node context
- Cost Tracker: Per-session token and USD cost aggregation

## Context Caching

| Cache Key Pattern | TTL | Purpose |
|-------------------|-----|---------|
| research:{hash} | 24h | Skip duplicate Perplexity calls |
| report_ctx:{session_id} | 7d | Pre-built chat context |
| node_output:{session_id}:{node} | 24h | Idempotent retry support |

Redis with in-memory fallback when Redis is unavailable.

## Database Schema

- research_sessions — Session metadata, status, cost metrics
- reports — Final structured report JSON
- chat_messages — Follow-up conversation history
- workflow_events — Node-level observability events
