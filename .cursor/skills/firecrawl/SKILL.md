---
name: firecrawl
description: |
  Firecrawl gives AI agents and apps fast, reliable web context with
  strong search, scraping, and interaction tools. One install command
  sets up three skill segments: live CLI tools, app-integration build
  skills, and outcome-focused workflow skills. Route the reader to the
  right usage path after install.
---

# Firecrawl

Firecrawl helps agents search first, scrape clean content, interact
with live pages when plain extraction is not enough, and produce
finished deliverables from web data.

**Project integration:** store `FIRECRAWL_API_KEY` in root `.env`. API base: `https://api.firecrawl.dev/v2`. Auth: `Authorization: Bearer fc-...`

## Install (optional — CLI path)

```bash
npx -y firecrawl-cli@latest init --all --browser
```

Segments: CLI skills (`firecrawl/cli`), build skills (`firecrawl/skills`), workflow skills (`firecrawl/firecrawl-workflows`).

## Path B: Integrate Into This Codebase (ProspectLens)

Use when wiring Firecrawl into the backend research pipeline (not the agent's own terminal).

```dotenv
FIRECRAWL_API_KEY=fc-...
```

Build skill routing:
- `firecrawl-build-search` — query discovery
- `firecrawl-build-scrape` — known URL → clean markdown
- `firecrawl-build-interact` — clicks, forms, login
- `firecrawl-build-parse` — PDF/DOCX/XLSX

### v2 REST endpoints (verified in this project)

| Endpoint | Use case |
| -------- | -------- |
| `POST /search` | Discover pages by query |
| `POST /scrape` | Extract clean markdown from a URL |
| `POST /map` | Discover URLs on a site |
| `POST /crawl` | Bulk extraction (async, higher cost) |
| `POST /interact` | Browser actions on live pages |
| `POST /support/docs-search` | Firecrawl docs Q&A |
| `POST /support/ask` | Diagnose failing jobs by `jobId` |

Docs: https://docs.firecrawl.dev

## ProspectLens research fit

| Capability | Fits when |
| ---------- | --------- |
| **Scrape** | User provides company website — primary source, pricing, about |
| **Search** | Extra discovery alongside Perplexity/Tavily |
| **Map** | Find key pages (pricing, careers, docs) before scrape |
| **Crawl** | Deep multi-page company research (higher cost) |
| **Interact** | Login-gated or JS-heavy pages |

Default flow for company research: **map → scrape key pages** or **search → scrape top hits**.

## Choose Your Path

- **Live web data this session** → Path A (CLI)
- **Add to app code** → Path B (build skills) — **this repo**
- **Finished deliverable** → Path C (workflow skills)
- **Get API key** → Path D (browser/CLI auth) or dashboard
- **No install** → Path E (REST API directly) — **recommended for backend**

## Path E: REST API (no CLI)

**Base URL:** `https://api.firecrawl.dev/v2`  
**Auth:** `Authorization: Bearer fc-YOUR_API_KEY`

### Scrape example

```json
POST /scrape
{ "url": "https://example.com", "formats": ["markdown"] }
```

### Search example

```json
POST /search
{ "query": "Acme Corp company overview", "limit": 5 }
```

### Map example

```json
POST /map
{ "url": "https://example.com", "limit": 20 }
```
