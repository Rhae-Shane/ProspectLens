# Assignment Rubric Review — ProspectLens

Assessment against the **Zylabs Full Stack AI Engineer Assignment** (LangGraph Research Copilot).

**Overall posture:** The project **meets or exceeds** most functional requirements. Strongest areas are frontend UX, AI/report pipeline, and documentation. The main gap for the **LangGraph (25%)** weight is that the graph is **defined** but **manually executed** — not invoked via `graph.ainvoke()` / checkpointing.

---

## Assignment Checklist

| Requirement | Status | Where |
|-------------|--------|--------|
| React frontend | ✅ | `frontend/src/` — Vite, TanStack Query, Tailwind |
| Python + FastAPI backend | ✅ | `backend/app/main.py`, REST under `/api/v1` |
| LangGraph (mandatory) | ⚠️ | `graph.py` — 7 nodes, conditional routing; execution in `workflow_service.py` |
| Create research session | ✅ | `POST /sessions`, `NewSessionPage.tsx` |
| Workflow progress UI | ✅ | SSE `useWorkflowEvents.ts`, `WorkflowProgress.tsx`, trace panel |
| Structured report (9+ sections) | ✅ | **10 sections** — `REPORT_NAV_ITEMS` in `structured-report.ts` |
| Follow-up chat | ✅ | `FollowUpChatPage.tsx`, RAG + 6 tools |
| Persist sessions & outputs | ✅ | Postgres: sessions, reports, events, chat, RAG chunks |
| README + 3 docs | ✅ | `README.md`, `docs/architecture.md`, `engineering-decisions.md`, `product-improvements.md` |
| Demo / deployment | ⚠️ | Docker Compose ready; demo video/hosted deploy is operator-owned |

### Report sections (all required + extras)

| Required section | Implemented |
|------------------|-------------|
| Company Overview | ✅ `CompanyOverviewDashboard` |
| Products & Services | ✅ |
| Target Customers | ✅ |
| Business Signals | ✅ |
| Risks & Challenges | ✅ |
| Discovery Questions | ✅ |
| Outreach Strategy | ✅ |
| Unknowns | ✅ |
| Sources | ✅ |
| *Extra:* Stakeholders | ✅ (beyond assignment minimum) |

---

## Rubric Scorecard

### 1. Frontend Engineering (15%) — **Strong (~13/15)**

**Met**
- Session create, list, detail, report workspace, briefing dashboards
- Real-time workflow stepper + observability trace
- Follow-up chat with tool picker
- Loading/error states (TanStack Query, toasts)
- Responsive layout (sidebar + scroll areas)
- Auth gate + sign-in (`ProtectedRoute`, `/login`)
- Export PDF + View Full Report

**Gaps**
- No frontend unit/E2E tests
- Workflow stepper shows 5 steps (hides Recovery + Report Validation)
- Unused template pages under `pages/dashboard/` (not routed)

### 2. Backend Engineering (20%) — **Strong (~16/20)**

**Met**
- Session, workflow, chat, tools, usage, auth APIs
- Async SQLAlchemy + JSONB reports
- Structured logging, config via env, error handling
- JWT auth, user seeding from `.env`
- Alembic migrations (incl. pgvector RAG)

**Gaps**
- Sessions **not scoped to user** (`user_id` missing on `research_sessions`)
- Retry restarts full pipeline, not from failed node
- No rate limiting; workflows run in-process (`asyncio.create_task`)
- Production Docker image omits Alembic run step

### 3. LangGraph Design (25%) — **Partial (~17/25)** ← highest-impact area

**Met**
- 7 nodes: Planner → Research → Analyze → QC → (Recovery) → Report → Validation
- Shared `ResearchState` TypedDict
- Conditional routing after QC (`quality_score >= 0.75` or `retry_count >= 2`)
- Recovery loop with gap-targeted queries
- Intermediate outputs in `node_outputs` + `workflow_events` table
- Backend tests: `tests/test_graph.py`

**Gaps**
- **`compile_graph()` never invoked** — `workflow_service.py` manually calls nodes
- No Postgres checkpointer / crash resume
- SSE emits top-level node events only (not report-pipeline sub-steps)
- `ResearchState.errors` unused; failures are all-or-nothing per node

### 4. AI Engineering (15%) — **Strong (~13/15)**

**Met**
- Multi-provider research (Perplexity, Firecrawl, Apollo, Tavily, NewsAPI, ProductHunt)
- Hybrid QC (deterministic coverage + LLM)
- Multi-call report pipeline + Apollo firmographics extractors
- Report validation node
- pgvector RAG + chat agent with tools
- JSON parse fallbacks in `complete_json`

**Gaps**
- No structured output schemas on workflow LLM calls
- No eval harness / golden companies
- No per-field confidence scores yet
- Chat history truncated to 6 messages

### 5. Production Readiness (10%) — **Moderate (~7/10)**

**Met**
- Docker Compose (pgvector Postgres, Redis, backend, frontend)
- Health endpoint, CORS, LangSmith optional
- `docs/DEPLOYMENT.md`
- Auth with env-based credentials

**Gaps**
- No CI/CD (GitHub Actions)
- No `/health/ready` with DB/Redis checks
- Workflows lost on process restart
- Default `AUTH_SECRET_KEY` allowed in dev

### 6. Product & Business Thinking (15%) — **Strong (~14/15)**

**Met**
- `product-improvements.md` answers all 10 prompts
- Clear buyer/user/value prop
- Roadmaps, risks, feature add/remove
- API usage dashboard for cost visibility

**Gaps**
- Product features lag roadmap (CRM, confidence, teams not built)

---

## Estimated Rubric Weighting

| Area | Weight | Self-assessment |
|------|--------|-----------------|
| Frontend | 15% | ~87% |
| Backend | 20% | ~80% |
| LangGraph | 25% | ~68% |
| AI Engineering | 15% | ~87% |
| Production | 10% | ~70% |
| Product/Business | 15% | ~93% |
| **Weighted total** | | **~79–82%** |

*Subjective; reviewers may weight LangGraph execution gap heavily.*

---

## Improvement Scope (Prioritized)

### P0 — Do before submission demo (1–2 days)

| # | Improvement | Rubric impact | Effort |
|---|-------------|---------------|--------|
| 1 | **Wire `graph.astream()` / `ainvoke()`** in `workflow_service.py`; map LangGraph events → SSE | LangGraph +25% area | M |
| 2 | **Record demo video** — create session → progress → 10-section report → chat with RAG | Submission | S |
| 3 | **User-scoped sessions** — `user_id` on `research_sessions`, filter list/get APIs | Backend + Product | M |
| 4 | **GitHub Actions** — `pytest`, `npm run build` | Production | S |
| 5 | **Fix stale docs** — auth exists; update `product-improvements.md` weakness #2 | Product | S |

### P1 — Strong differentiators (3–5 days)

| # | Improvement | Rubric impact | Effort |
|---|-------------|---------------|--------|
| 6 | **LangGraph Postgres checkpointer** — resume after crash | LangGraph | L |
| 7 | **OpenAI structured outputs** for planner/analyze/report JSON | AI Engineering | M |
| 8 | **Confidence badges** on snapshot fields (Apollo vs inferred) | Product + AI | M |
| 9 | **Workflow UI** — show Recovery + Validation steps; optional report sub-progress | Frontend | S |
| 10 | **Alembic in Docker** — `alembic upgrade head` on startup; users migration | Production | S |
| 11 | **Eval harness** — 3 fixture companies, assert section coverage | AI Engineering | M |
| 12 | **Delete** unused `pages/dashboard/` template residue | Frontend hygiene | S |

### P2 — Post-assignment / production (2+ weeks)

| # | Improvement | Notes |
|---|-------------|--------|
| 13 | Job queue (Celery/ARQ) for workflows | Scaling |
| 14 | Rate limiting on `/run` and `/chat` | Abuse prevention |
| 15 | CRM export (HubSpot/Salesforce) | Product roadmap week 2 |
| 16 | Team workspaces + SSO | Enterprise |
| 17 | Server-side PDF generation | Consistent exports |
| 18 | Meeting outcome capture | Closes Unknowns loop |
| 19 | Streaming chat tokens (SSE) | UX polish |
| 20 | Budget cap enforcement before provider calls | Cost control |

**Effort key:** S = hours, M = 1–2 days, L = 3+ days

---

## LangGraph Rubric Deep-Dive

| Criterion | Grade | Evidence |
|-----------|-------|----------|
| Multiple meaningful nodes | ✅ A | 7 nodes, report pipeline is multi-call inside `report_generator` |
| Shared graph state | ✅ A | `ResearchState` in `state.py` |
| Conditional routing | ✅ A | `route_after_quality` in `quality.py` |
| Intermediate outputs | ⚠️ B | Rich `node_outputs`; SSE only for top-level nodes |
| Failure handling | ⚠️ B | try/catch → `FAILED` status; provider failures sanitized in research |
| Recoverability | ⚠️ C+ | QC retry loop yes; no checkpoint; manual retry = full restart |

**To reach A on LangGraph:** Execute the compiled graph natively + add checkpointer + stream graph events to SSE.

---

## Submission Readiness

| Item | Ready? |
|------|--------|
| GitHub repo | ✅ |
| README | ✅ |
| architecture.md | ✅ |
| engineering-decisions.md | ✅ |
| product-improvements.md | ✅ (update auth weakness) |
| Hosted deployment | ⚠️ Docker local; Railway/Vercel documented |
| Demo video | ❌ Operator to record |

---

## Recommended Demo Script (5–7 min)

1. Sign in at `/login`
2. Create session (e.g. Vercel or Stripe template)
3. Watch SSE workflow progress + expand trace panel
4. Walk 2–3 report dashboards (Company Overview firmographics, Target Customers, Sources)
5. View Full Report + Export PDF
6. Follow-up chat: enable **Search Report**, ask a question grounded in briefing
7. Mention: 7-node LangGraph, hybrid QC, multi-provider research, pgvector RAG

---

## One-Line Pitch for Reviewers

> ProspectLens is a production-shaped sales research copilot with a 7-node LangGraph workflow (planner → multi-provider research → analysis → hybrid QC → conditional recovery → multi-call report pipeline → validation), 10 dashboard report sections, pgvector RAG chat with tools, and full persistence — with the main technical debt being manual graph execution instead of native LangGraph invoke/checkpointing.
