# ProspectLens

**Your sellers run the conversation. We do everything else.**

ProspectLens is a production-grade AI Research Copilot that helps sales teams prepare for business meetings by researching companies and generating structured briefings, powered by a multi-node LangGraph workflow.

## Features

- **Research Session Management** — Create, list, and persist research sessions
- **LangGraph AI Workflow** — Planner, Research, Analysis, Quality Check, Report (with conditional retry loop)
- **Real-time Progress** — SSE-powered workflow progress UI with observability trace panel
- **Structured Reports** — 9-section meeting briefings with cited sources
- **Follow-up Chat** — Context-aware chat grounded in the research report (Redis context caching)
- **Observability** — LangSmith tracing, per-node token/cost tracking, workflow event persistence

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, TanStack Query, Tailwind CSS |
| Backend | Python 3.12, FastAPI, SQLAlchemy, PostgreSQL |
| AI Workflow | LangGraph (6 nodes, conditional routing, shared state) |
| Research | Perplexity API (web search + citations) |
| Orchestration | OpenAI GPT-4o (planning, analysis, QC, report, chat) |
| Cache | Redis (research results, report context, node outputs) |
| Observability | LangSmith, structlog, SSE event stream |

## Quick Start (Docker)

1. Copy `.env.example` to `.env` in the project root and add your API keys.
2. Run `docker compose up --build`
3. Open http://localhost:3000 (frontend) and http://localhost:8000/docs (API)

## Local Development

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
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

## Deployment

### Backend (Railway / Render)

- Root directory: `backend/`
- Use included Dockerfile
- Add PostgreSQL + Redis and environment variables from `backend/.env.example`

### Frontend (Vercel / Netlify)

- Root directory: `frontend/`
- Build command: `npm run build`
- Output directory: `dist`
- Set `VITE_API_URL` to your hosted backend URL

## Documentation

- [Architecture](docs/architecture.md)
- [Engineering Decisions](docs/engineering-decisions.md)
- [Product Improvements](docs/product-improvements.md)

## Testing

```bash
cd backend
pytest tests/ -v
```
## Hot Reload Development (Docker)

For development with live reload on code changes:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

- Frontend (Vite HMR): http://localhost:5173
- Backend (uvicorn --reload): http://localhost:8000

Changes to `backend/app/` and `frontend/src/` reload automatically without rebuilding images.

### Local dev without Docker

```bash
# Terminal 1 - infra
docker compose up postgres redis -d

# Terminal 2 - backend
cd backend && uvicorn app.main:app --reload --port 8000

# Terminal 3 - frontend
cd frontend && npm run dev
```