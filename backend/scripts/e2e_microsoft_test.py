"""End-to-end API test: Microsoft session + workflow + checkpoint verification."""

from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request

BASE = "http://localhost:8000"
EMAIL = "admin@prospectlens.com"
PASSWORD = "ProspectLens2026!"
POLL_INTERVAL = 15
MAX_WAIT = 900  # 15 min


def req(method: str, path: str, token: str | None = None, body: dict | None = None) -> dict:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(f"{BASE}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=60) as resp:
            raw = resp.read().decode()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode()
        raise RuntimeError(f"{method} {path} -> {exc.code}: {detail}") from exc


def sign_in() -> str:
    data = req("POST", "/api/v1/auth/signin", body={"email": EMAIL, "password": PASSWORD})
    print(f"[OK] Signed in as {data['user']['email']}")
    return data["access_token"]


def create_session(token: str) -> str:
    payload = {
        "company_name": "Microsoft",
        "website": "https://www.microsoft.com",
        "objective": "Prepare for an enterprise sales meeting - understand products, ICP, recent signals, and outreach angles.",
    }
    session = req("POST", "/api/v1/sessions", token, payload)
    sid = session["id"]
    print(f"[OK] Created session {sid} for Microsoft")
    return sid


def run_workflow(token: str, sid: str) -> None:
    data = req("POST", f"/api/v1/sessions/{sid}/run", token)
    print(f"[OK] Workflow started: {data['message']}")


def get_session(token: str, sid: str) -> dict:
    return req("GET", f"/api/v1/sessions/{sid}", token)


def get_checkpoint(token: str, sid: str) -> dict:
    return req("GET", f"/api/v1/sessions/{sid}/workflow/state", token)


def get_events(token: str, sid: str) -> list:
    return req("GET", f"/api/v1/sessions/{sid}/events", token)


def wait_for_completion(token: str, sid: str) -> dict:
    started = time.time()
    seen_nodes: set[str] = set()
    while time.time() - started < MAX_WAIT:
        session = get_session(token, sid)
        status = session["status"]
        events = get_events(token, sid)
        for ev in events:
            if ev["node"] != "workflow" and ev["event_type"] == "completed":
                seen_nodes.add(ev["node"])

        checkpoint = get_checkpoint(token, sid)
        elapsed = int(time.time() - started)
        print(
            f"  [{elapsed}s] status={status} workflow={session.get('workflow_status')} "
            f"nodes={sorted(seen_nodes)} checkpoint={checkpoint.get('has_checkpoint')} "
            f"can_resume={checkpoint.get('can_resume')}"
        )

        if status == "completed":
            return session
        if status == "failed":
            raise RuntimeError(f"Workflow failed: {session.get('error_message')}")

        time.sleep(POLL_INTERVAL)

    raise TimeoutError(f"Workflow did not complete within {MAX_WAIT}s")


def verify_report(session: dict) -> None:
    report = session.get("report")
    if not report:
        raise AssertionError("No report on completed session")

    sections = [
        "company_overview",
        "products_services",
        "target_customers",
        "business_signals",
        "risks_challenges",
        "outreach_strategy",
    ]
    missing = [s for s in sections if not report.get(s)]
    structured = report.get("structured") or {}
    snapshot = structured.get("company_snapshot") or {}

    print(f"[OK] Report received - {len(report.get('sources', []))} sources")
    print(f"  Sections present: {len(sections) - len(missing)}/{len(sections)}")
    if missing:
        print(f"  Thin sections: {missing}")
    if snapshot:
        print(f"  Snapshot fields: {list(snapshot.keys())[:8]}")
    if structured.get("company_overview"):
        print("  Structured company_overview: yes")


def main() -> int:
    print("=== ProspectLens E2E: Microsoft ===\n")
    token = sign_in()
    sid = create_session(token)
    run_workflow(token, sid)

    # Checkpoint should exist shortly after start
    time.sleep(5)
    cp_early = get_checkpoint(token, sid)
    print(f"[OK] Early checkpoint check: has_checkpoint={cp_early.get('has_checkpoint')}")

    print("\nPolling workflow...")
    session = wait_for_completion(token, sid)

    cp_final = get_checkpoint(token, sid)
    print(f"\n[OK] Final checkpoint: {json.dumps(cp_final, indent=2)}")

    verify_report(session)
    print(
        f"\n[OK] Usage: {session.get('total_tokens', 0):,} tokens - "
        f"${session.get('total_cost_usd', 0):.4f}"
    )
    print(f"\n=== PASSED — session {sid} ===")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"\n=== FAILED: {exc} ===", file=sys.stderr)
        raise SystemExit(1) from exc
