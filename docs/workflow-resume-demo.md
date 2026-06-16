# Workflow Failure & Resume — Demo Guide

ProspectLens uses **LangGraph Postgres checkpointing** so a research workflow can survive crashes and continue from the last completed node.

## What happens on failure

1. **During graph execution** — each node checkpoint is written to Postgres (`langgraph-checkpoint-postgres` tables).
2. **On exception** — session status → `failed`, `error_message` set, checkpoint **kept**.
3. **On success** — report saved, RAG indexed, session → `completed`.

## API reference

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/sessions/{id}/workflow/state` | `has_checkpoint`, `can_resume`, `next_nodes` |
| `POST /api/v1/sessions/{id}/resume` | Continue from checkpoint (`astream(None, config)`) |
| `POST /api/v1/sessions/{id}/retry` | Clear checkpoint + full restart |
| `POST /api/v1/sessions/{id}/run` | Fresh run (clears checkpoint) |

## UI

On **Sessions → Details** or **Workflow** tab, when a session is `failed` or stuck `running`:

- **Resume workflow** — continues from checkpoint (primary)
- **Restart from scratch** — full pipeline retry

## Demo script (for video or reviewer)

### Option A — Kill backend (most convincing)

```bash
# 1. Create session and start workflow (UI or API)
# 2. Wait until planner + research complete (watch SSE or logs)
docker stop zylabs-backend-1

# 3. Check checkpoint (replace SESSION_ID and token)
curl -s http://localhost:8000/api/v1/sessions/SESSION_ID/workflow/state \
  -H "Authorization: Bearer TOKEN"
# Expect: "can_resume": true, "next_nodes": ["analyze", ...] or similar

# 4. Restart and resume
docker start zylabs-backend-1
curl -X POST http://localhost:8000/api/v1/sessions/SESSION_ID/resume \
  -H "Authorization: Bearer TOKEN"
```

### Option B — UI only

1. Sign in → create session for a company → run workflow.
2. Stop Docker backend mid-run.
3. Restart backend → open session → click **Resume workflow**.
4. Show SSE trace: no second planner/research pass; workflow completes.

## In-graph recovery vs checkpoint resume

| Mechanism | Trigger | Behavior |
|-----------|---------|----------|
| **QC recovery loop** | Low `quality_score` | Recovery node → research again (same run, no API resume) |
| **Checkpoint resume** | Crash / failed run | Continue from last saved node via `POST /resume` |

## Tests

```bash
cd backend
pytest tests/test_checkpoint_resume.py tests/test_graph_execution.py -v
```

`test_checkpoint_resume.py` uses `MemorySaver` to prove resume skips already-completed nodes.
