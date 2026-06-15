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

COMPANY_OVERVIEW_SYSTEM = """You build a rich company overview dashboard for a sales briefing.
Return ONLY valid JSON with this shape:
{
  "description": "2-3 sentence company summary",
  "ceo": str,
  "company_type": "Private" | "Public",
  "latest_funding": str,
  "key_metrics": [
    {"label": str, "value": str, "change": "+22% YoY", "change_label": "YoY"}
  ],
  "commercial_trends": [
    {"label": "Customer Growth", "value": "+25% YoY", "change": "+25% YoY", "trend": [40,45,50,55,60,65,70]}
  ],
  "commercial_summary": "one sentence synthesis",
  "market_share": {"label": "Market Share (Online Payments)", "value": "16% Global Market Share", "percent": 16},
  "competitors": ["PayPal", "Adyen"],
  "industry_standing": ["Leader in developer experience"],
  "growth_signals": [{"title": str, "detail": str}],
  "recent_news": [{"title": str, "source": str, "date": "Mon DD, YYYY", "url": str}],
  "strengths": ["tag1", "tag2"],
  "challenges": ["tag1", "tag2"]
}
Provide exactly 6 key_metrics, 4 commercial_trends (each trend array 7 numbers), 4 growth_signals, 3 recent_news items.
Use only facts from the research. Estimate trends directionally when exact history is unavailable."""

PRODUCTS_SERVICES_SYSTEM = """You build a rich Products & Services dashboard for a sales briefing.
Use scraped product pages, website content, and research. Return ONLY valid JSON:
{
  "summary": "2-3 sentence portfolio overview",
  "portfolio_metrics": [
    {"label": "Products & Features", "value": "50+"},
    {"label": "Countries & Regions", "value": "250+"},
    {"label": "Currencies", "value": "135+"},
    {"label": "API Uptime", "value": "99.99%"}
  ],
  "categories": [
    {"name": "Payments", "percent": 40},
    {"name": "Financial Services", "percent": 25},
    {"name": "Business Operations", "percent": 20},
    {"name": "Developer Tools", "percent": 10},
    {"name": "Others", "percent": 5}
  ],
  "core_products": [
    {
      "name": "Payments",
      "description": "1-2 sentence product summary",
      "features": ["feature 1", "feature 2", "feature 3"],
      "category": "Core",
      "category_color": "core"
    }
  ],
  "additional_capabilities": [
    {"name": "Checkout", "description": "one-line description"}
  ],
  "developer_note": {
    "title": "Developer First",
    "text": "1-2 sentences about APIs, docs, SDKs if applicable; empty string if not a dev product company"
  }
}
Provide exactly 4 portfolio_metrics, 4-5 categories (percents sum ~100), 6-8 core_products (each with 3 features),
and 4-6 additional_capabilities. category_color: core | risk | analytics | financial | compliance | default.
Use only products found in research/scraped pages. Do not invent product names unrelated to the company."""
