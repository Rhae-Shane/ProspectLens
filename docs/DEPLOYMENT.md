# Deployment Guide

## Prerequisites

- Docker and Docker Compose (local/demo)
- API keys: at minimum `OPENAI_API_KEY`, `PERPLEXITY_API_KEY`
- Recommended: `APOLLO_API_KEY`, `FIRECRAWL_API_KEY` for richer reports

## Docker (local or server)

1. Create `.env` in the project root with API keys (see `.env.example`)
2. Run:

```bash
docker compose up --build -d
```

3. Access:
   - Frontend: http://localhost:3000
   - API docs: http://localhost:8000/docs
   - Health: http://localhost:8000/health

## Production (DigitalOcean droplet)

Same command as local — one compose file:

```bash
cd ~/ProspectLens
git pull
docker compose up --build -d
```

Open **http://YOUR_DROPLET_IP:3000/home**

Optional firewall (allow SSH + app port only):

```bash
ufw allow OpenSSH
ufw allow 3000/tcp
ufw --force enable
```

If accessing via IP, add to `.env` on the server:

```env
CORS_ORIGINS=http://YOUR_DROPLET_IP:3000,http://localhost:3000
```

Remove any leftover certbot/nginx containers from earlier attempts:

```bash
docker rm -f $(docker ps -aq --filter "name=certbot") 2>/dev/null || true
docker compose down
docker compose up --build -d
```

### Postgres (pgvector)

The compose stack uses `pgvector/pgvector:pg16`. The backend runs on startup:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

then creates tables including `report_rag_chunks`.

**Switching from stock Postgres:** if you have an existing `postgres_data` volume from a non-pgvector image, recreate the volume or enable pgvector manually before starting the backend:

```bash
docker compose down
docker volume rm zylabs_postgres_data   # destroys local DB data
docker compose up --build
```

### Development overlay

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

| Service | URL |
|---------|-----|
| Frontend (Vite) | http://localhost:5173 |
| Backend | http://localhost:8000 |

### Migrations (production)

For production deploys prefer Alembic over `create_all`:

```bash
cd backend
alembic upgrade head
```

Migrations include:

| Revision | Change |
|----------|--------|
| `001_initial` | Core tables |
| `002_chat_message_metadata` | Chat `metadata` JSONB column |
| `003_pgvector_rag_chunks` | `vector` extension + RAG table |

**Note:** The production `Dockerfile` copies only `app/` — run migrations from CI/CD or a one-off job with `alembic.ini` and `alembic/` mounted or copied.

## Railway (Backend)

1. Connect GitHub repo
2. Set root to `backend/` or use `railway.toml`
3. Add **PostgreSQL with pgvector** (enable extension or use a pgvector-compatible image)
4. Add Redis plugin
5. Set environment variables:

| Variable | Example |
|----------|---------|
| `DATABASE_URL` | `postgresql+asyncpg://...` |
| `REDIS_URL` | `redis://...` |
| `OPENAI_API_KEY` | `sk-...` |
| `PERPLEXITY_API_KEY` | `pplx-...` |
| `APOLLO_API_KEY` | optional |
| `FIRECRAWL_API_KEY` | optional |
| `TAVILY_API_KEY` | optional |
| `CORS_ORIGINS` | `https://your-frontend.vercel.app` |
| `LANGSMITH_TRACING` | `true` (optional) |

6. Run `alembic upgrade head` after first deploy

## Render (Backend)

1. Use `render.yaml` blueprint or manual web service
2. Docker runtime with `backend/Dockerfile`
3. Add managed PostgreSQL — **enable pgvector extension**
4. Add Redis instance
5. Set env vars as above
6. Run migrations on deploy

## Vercel (Frontend)

1. Import repo, set root directory to `frontend/`
2. Framework preset: **Vite**
3. Build command: `npm run build`
4. Output directory: `dist`
5. Environment variable: `VITE_API_URL=https://your-api.railway.app`
6. Deploy

Ensure backend `CORS_ORIGINS` includes your Vercel domain.

## Post-Deploy Checklist

- [ ] `GET /health` returns `{"status":"healthy"}`
- [ ] `GET /api/v1/chat/tools` returns 6 tools including `search_report`
- [ ] Create session → run workflow → report completes
- [ ] Chat message retrieves RAG chunks (check assistant `metadata.rag_sections` if present)
- [ ] View Full Report and Export PDF work in browser
- [ ] LangSmith traces appear when enabled

## Demo Video Checklist

- Create research session (or use example template: Vercel, Stripe, Shopify, etc.)
- Watch workflow progress (SSE stepper + trace panel)
- Review 10-section dashboard briefing
- Show company snapshot firmographics (Founded, HQ, Employees)
- Ask follow-up chat question (enable **Search Report** tool)
- Open **View Full Report** and **Export PDF**
- Expand Workflow Trace panel

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `ModuleNotFoundError: pgvector` | Rebuild backend image after `pyproject.toml` change |
| `type "vector" does not exist` | Use pgvector Postgres image; ensure extension runs before `create_all` |
| Empty report sections | Re-run research on old sessions (schema predates overview fields) |
| Chat RAG returns nothing | Confirm workflow completed and `report_rag_chunks` has rows for session |
| CORS errors | Add your frontend origin to `CORS_ORIGINS` in `.env` |
| Linux Docker build fails on UI imports | Component files must be lowercase (`button.tsx` not `Button.tsx`) |

## GitHub Actions (CI only)

Manual workflow: GitHub → **Actions** → **CI** → **Run workflow**.

Runs `pytest` + `npm run build`. Does **not** deploy to the server.
