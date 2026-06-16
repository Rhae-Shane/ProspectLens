# ProspectLens

**Your sellers run the conversation. We do everything else.**

ProspectLens is an AI Research Copilot that helps sales teams prepare for business meetings by researching companies and generating structured briefings, powered by a multi-node LangGraph workflow with multi-provider research and pgvector RAG chat.

## Features

- **Research Session Management** — Create, list, and persist research sessions with example company templates
- **LangGraph AI Workflow** — Planner → multi-provider Research → Analyze → hybrid QC → conditional Recovery → Report → Validation
- **Multi-Provider Research** — Perplexity, Firecrawl, Apollo, Tavily, NewsAPI, ProductHunt (when API keys are set)
- **Real-time Progress** — SSE-powered workflow UI with observability trace panel
- **Structured Reports** — 10-section meeting briefings with dashboard views and cited sources
- **Firmographics Enrichment** — Apollo data merged into company snapshot (founded, HQ, employees, valuation)
- **Follow-up Chat** — Tool-calling agent with pgvector RAG over the briefing + Redis context cache
- **Chat Tools** — Search report, web search, Apollo enrichment, news, deep research, website scrape
- **Export & Full Report** — View all sections in one dialog; export print-ready PDF from any section
- **Observability** — LangSmith tracing, per-node token/cost tracking, workflow event persistence

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, TanStack Query, Tailwind CSS, shadcn/ui |
| Backend | Python 3.12, FastAPI, SQLAlchemy (async), Alembic |
| Database | PostgreSQL 16 + **pgvector** (reports, sessions, RAG embeddings) |
| Cache | Redis (research dedup, chat context, node outputs) |
| AI Workflow | LangGraph (7 nodes, conditional routing, shared state) |
| Research | Perplexity, Firecrawl, Apollo, Tavily, NewsAPI, ProductHunt |
| Orchestration | OpenAI GPT-4o (planning, analysis, QC, report, chat) |
| Embeddings | OpenAI `text-embedding-3-small` for report RAG |
| Observability | LangSmith, structlog, SSE event stream |

## Quick Start (Docker)

1. Copy `.env.example` to `.env` in the project root and add your API keys (at minimum `OPENAI_API_KEY` and `PERPLEXITY_API_KEY`).
2. Run `docker compose up --build`
3. Open http://localhost:3000 (frontend) and http://localhost:8000/docs (API)

Postgres uses the `pgvector/pgvector:pg16` image. The backend enables the `vector` extension on startup.

## Local Development

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -e ".[dev]"
cp .env.example .env
docker compose up postgres redis -d
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### Hot Reload (Docker)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

- Frontend (Vite HMR): http://localhost:5173
- Backend (uvicorn `--reload`): http://localhost:8000

Changes to `backend/app/` and `frontend/src/` reload automatically without rebuilding images.

### Local dev without Docker

```bash
# Terminal 1 - infra (pgvector Postgres + Redis)
docker compose up postgres redis -d

# Terminal 2 - backend
cd backend && uvicorn app.main:app --reload --port 8000

# Terminal 3 - frontend
cd frontend && npm run dev
```

## Environment Variables

See `backend/.env.example`. Key variables:

| Variable | Required | Purpose |
|----------|----------|---------|
| `OPENAI_API_KEY` | Yes | Workflow + chat + embeddings |
| `PERPLEXITY_API_KEY` | Yes | Primary web research |
| `DATABASE_URL` | Yes | PostgreSQL (asyncpg) |
| `REDIS_URL` | Yes | Context cache |
| `APOLLO_API_KEY` | Recommended | Firmographics enrichment |
| `FIRECRAWL_API_KEY` | Recommended | Website scrape/crawl |
| `TAVILY_API_KEY` | Optional | Supplemental search + chat tool |
| `NEWAPIORG_API_KEY` | Optional | Recent news |
| `LANGSMITH_*` | Optional | Tracing |

## Deployment

### Backend (Railway / Render)

- Root directory: `backend/`
- Use included `Dockerfile`
- **PostgreSQL must support pgvector** (`pgvector/pgvector` image or managed extension)
- Add Redis and environment variables from `backend/.env.example`
- Run `alembic upgrade head` if using migrations instead of `create_all`

### Frontend (Vercel / Netlify)

- Root directory: `frontend/`
- Build command: `npm run build`
- Output directory: `dist`
- Set `VITE_API_URL` to your hosted backend URL

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for platform-specific steps.

## Documentation

- [Assignment Rubric Review](docs/assignment-review.md)
- [LangGraph Native Execution Plan](docs/langgraph-native-execution-plan.md)
- [Architecture](docs/architecture.md) — system design, workflow, RAG, report pipeline
- [Engineering Decisions](docs/engineering-decisions.md) — tradeoffs and technical debt
- [Product Improvements](docs/product-improvements.md) — roadmap and product notes
- [Deployment](docs/DEPLOYMENT.md) — Docker, Railway, Render, Vercel

## Testing

```bash
cd backend
pytest tests/ -v
```

## Re-running Research

Report schema and enrichment logic evolve over time. **Existing sessions keep their stored report** until you re-run research (`POST /sessions/{id}/run`). Re-run to populate new overview fields, Apollo firmographics, and refreshed RAG chunks.
