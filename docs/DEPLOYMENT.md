# Deployment Guide

## Docker (Recommended for Demo)

1. Create `.env` in project root with API keys
2. Run `docker compose up --build`
3. Access frontend at http://localhost:3000

## Railway (Backend)

1. Connect GitHub repo
2. Set root to `backend/` or use `railway.toml`
3. Add PostgreSQL and Redis plugins
4. Set env vars: OPENAI_API_KEY, PERPLEXITY_API_KEY, DATABASE_URL, REDIS_URL, CORS_ORIGINS

## Render (Backend)

1. Use `render.yaml` blueprint or manual web service
2. Docker runtime with `backend/Dockerfile`
3. Add managed PostgreSQL

## Vercel (Frontend)

1. Import repo, set root directory to `frontend/`
2. Framework preset: Vite
3. Environment variable: VITE_API_URL=https://your-api.railway.app
4. Deploy

## Demo Video Checklist

- Create research session
- Watch workflow progress (SSE stepper)
- Review 9-section report
- Ask follow-up chat question
- Expand Workflow Trace panel