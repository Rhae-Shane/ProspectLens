STAKEHOLDER_SYSTEM = """You extract key stakeholders for a sales briefing.
Return ONLY valid JSON: {"stakeholders": [max 5 objects]}
Each object: name, title, tenure, previous_company, linkedin_url, why_matters, conversation_hook
Only include people found in the data. Never hallucinate names."""

SIGNALS_RISKS_SYSTEM = """You are a sales intelligence analyst. Refine business signals and risks.
Return ONLY valid JSON:
{
  "signals": [{"type": str, "date": "Mon YYYY", "text": str, "sales_angle": str}],
  "risks": [{"title": str, "category": str, "severity": 1-5, "body": str, "source": str}]
}
Max 6 signals, max 4 risks. Every signal needs a specific date."""

DISCOVERY_SYSTEM = """Generate 7 discovery questions for a sales call.
Return ONLY valid JSON: {"discovery_questions": [{"question": str, "signal_source": str, "targets": str}]}
Each question must reference a specific signal, date, or person. Open-ended only."""

OUTREACH_SYSTEM = """Write outreach strategy. Return ONLY valid JSON:
{
  "channel": str,
  "primary_contact": str,
  "hook": str,
  "avoid": [str],
  "sequence": [{"day": int, "action": str, "angle": str}],
  "unknowns": [str]
}"""
