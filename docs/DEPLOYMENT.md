# Deployment Guide

## Prerequisites

- Docker and Docker Compose (local/demo)
- API keys: at minimum `OPENAI_API_KEY`, `PERPLEXITY_API_KEY`
- Recommended: `APOLLO_API_KEY`, `FIRECRAWL_API_KEY` for richer reports

## Docker (local demo)

1. Create `.env` in the project root with API keys (see `.env.example`)
2. Run:

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build
```

3. Access:
   - Frontend: http://localhost:3000
   - API docs: http://localhost:8000/docs
   - Health: http://localhost:8000/health

## Production (nginx + Certbot)

Production uses **nginx** on **80/443** and **Certbot** for **Let's Encrypt** certificates. No port 3000 is exposed publicly.

### Important: Certbot needs a hostname

**Let's Encrypt cannot issue certificates for a bare IP** (e.g. `139.59.60.0`). You need a hostname whose **A record** points to your droplet:

| Option | Example |
|--------|---------|
| Free subdomain | `prospectlens.duckdns.org` → A → `139.59.60.0` |
| Cheap domain | `app.yourdomain.com` → A → droplet IP |

You then access the app at **`https://your-hostname/home`** (not `https://IP`).

### One-time server setup

```bash
chmod +x deploy/setup-production.sh deploy/init-letsencrypt.sh
./deploy/setup-production.sh
```

Add to `.env` on the server:

```env
SERVER_IP=139.59.60.0
DOMAIN=your-subdomain.duckdns.org
ACME_EMAIL=you@example.com
CORS_ORIGINS=https://your-subdomain.duckdns.org
```

Issue the certificate and enable HTTPS:

```bash
./deploy/init-letsencrypt.sh
```

This script:

1. Starts the stack on HTTP (ACME challenge)
2. Runs **Certbot** (`certbot certonly --webroot`)
3. Switches nginx to HTTPS and reloads
4. The **certbot** container auto-renews every 12 hours

Access: **https://your-subdomain.duckdns.org/home**

Health: `curl -sf https://your-subdomain.duckdns.org/health`

### Postgres (pgvector)

The compose stack uses `pgvector/pgvector:pg16`. The backend runs on startup:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

then creates tables including `report_rag_chunks`.

**Switching from stock Postgres:** if you have an existing `postgres_data` volume from a non-pgvector image, recreate the volume or enable pgvector manually before starting the backend:

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml down
docker volume rm zylabs_postgres_data   # destroys local DB data
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build
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

- [ ] `curl -sf https://YOUR_HOSTNAME/health` returns `{"status":"healthy"}`
- [ ] Browser shows a valid padlock at `https://YOUR_HOSTNAME/home`
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
| CORS errors | Set `CORS_ORIGINS=https://YOUR_HOSTNAME` in server `.env` |
| Certbot fails | Confirm DNS A record points to droplet; ports 80/443 open; run `./deploy/init-letsencrypt.sh` || Linux Docker build fails on UI imports | Component files must be lowercase (`button.tsx` not `Button.tsx`) |

## GitHub Actions (manual CI/CD)

Workflows are **manual only** (`workflow_dispatch`) — nothing runs on push automatically.

| Workflow | File | Purpose |
|----------|------|---------|
| **CI** | `.github/workflows/ci.yml` | `pytest` + `npm run build` |
| **Deploy Production** | `.github/workflows/deploy-prod.yml` | CI tests → SSH deploy to droplet |

### One-time setup

1. Complete [Production (nginx + Certbot)](#production-nginx--certbot) on the droplet.
2. Add a **deploy SSH key** on the server (`~/.ssh/authorized_keys`) for GitHub Actions.
3. In GitHub → **Settings → Secrets and variables → Actions**, add:

| Secret | Example | Required |
|--------|---------|----------|
| `DEPLOY_HOST` | `139.59.60.0` (SSH) | Yes |
| `DEPLOY_DOMAIN` | `your-subdomain.duckdns.org` (HTTPS URL + health checks) | Yes |
| `DEPLOY_USER` | `root` | Yes |
| `DEPLOY_SSH_KEY` | Private key (PEM) | Yes |
| `DEPLOY_PATH` | `/root/ProspectLens` | Optional |
### Deploy to production

1. Push workflow files to `main` (one-time).
2. GitHub → **Actions** → **Deploy Production** → **Run workflow**.
3. Choose branch (`main` by default). Leave **Skip CI tests** unchecked unless emergency hotfix.
4. Workflow runs tests, then SSHs to the droplet:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

5. Verifies `https://YOUR_HOSTNAME/health` (Let's Encrypt cert).
`.env` on the server is **not** overwritten by CI — API keys, domain, and auth stay on the droplet.
