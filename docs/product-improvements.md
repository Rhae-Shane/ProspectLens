# Product Improvements

## Current Product Capabilities (baseline)

- 10-section structured briefing with dashboard UI per section
- Multi-provider research (Perplexity, Firecrawl, Apollo, Tavily, NewsAPI, ProductHunt)
- Hybrid QC with targeted recovery on thin sections
- Follow-up chat with 6 tools and pgvector RAG over the report
- View Full Report dialog and browser PDF export
- Real-time workflow progress via SSE + LangSmith tracing

## 5 Weaknesses

1. No CRM integration (Salesforce, HubSpot)
2. Auth exists but sessions are not user-scoped — all authenticated users see the same session list
3. Research quality still varies by company size and public data availability
4. No collaborative editing or shared annotations on reports
5. PDF export is browser-print based — formatting varies by client
6. LangGraph is defined but manually orchestrated — no checkpoint resume (see `docs/assignment-review.md`)

## Top 3 Improvements

1. **CRM Integration** — push briefing sections and discovery questions into opportunity records
2. **Confidence Scoring** — per-section and per-field confidence with source attribution
3. **Team Workspaces** — shared sessions, templates, and usage quotas

## Buyer, User, Payment

- **Buyer**: VP Sales / RevOps
- **User**: AEs and SDRs preparing for discovery and demo calls
- **Why they pay**: reduces research time from hours to minutes; consistent briefing quality across the team

## Success Metrics

- Time to briefing under 3 minutes
- 60% weekly active reps
- 80% reports opened before meetings
- 50%+ follow-up chat messages use `search_report` before external tools (RAG-first behavior)

## 4-Week AI Roadmap

| Week | Focus |
|------|-------|
| 1 | Per-section confidence scores + source links on snapshot fields |
| 2 | CRM MVP (push company overview + discovery questions) |
| 3 | Industry templates (SaaS, fintech, healthcare) with tuned research plans |
| 4 | Competitive battlecards from analyze-node competitor output |

## Risks

- API cost scaling with multi-provider research fan-out
- Background task queue needed at higher concurrency (today: in-process async)
- LLM provider outage — partial reports possible when optional providers fail
- pgvector index growth — re-index cost on large session volume

## Feature to Remove

Generic undifferentiated follow-up chat without tool or RAG grounding (mitigated today by `search_report` default path).

## Feature to Add

**Meeting Outcome Capture** — log what was learned on the call and close the loop on Unknowns.

## 90-Day Roadmap

| Month | Goal |
|-------|------|
| 1 | Design partners, confidence scoring, CRM export prototype |
| 2 | Team workspaces, shared templates, usage dashboard |
| 3 | Enterprise SSO, admin controls, server-side PDF |

## First Change

Add confidence scoring and “source” badges to company snapshot fields (Founded, HQ, Employees, Valuation) so reps know what is Apollo-confirmed vs research-inferred.

## Recently Shipped

- JWT sign-in (no signup) with env-seeded users
- pgvector RAG for chat (`search_report` tool)
- Apollo firmographics merged into company snapshot
- Richer `*_overview` blocks for customers, stakeholders, outreach
- View Full Report + Export PDF on all section dashboards
- Report validation node after generation
- Hybrid QC with section coverage and gap-targeted recovery
