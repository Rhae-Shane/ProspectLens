from typing import Any

from app.graph.nodes.report_pipeline.pipeline import run_report_pipeline


async def report_generator_node(state: dict[str, Any]) -> dict[str, Any]:
    report, node_outputs, tokens, cost = await run_report_pipeline(state)

    return {
        "report": report,
        "status": "completed",
        "node_outputs": node_outputs,
        "total_tokens": state.get("total_tokens", 0) + tokens,
        "total_cost_usd": state.get("total_cost_usd", 0.0) + cost,
    }
