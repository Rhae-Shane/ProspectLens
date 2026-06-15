STAKEHOLDER_SYSTEM = """You extract key stakeholders for a sales briefing.
Return ONLY valid JSON: {"stakeholders": [max 7 objects]}
Each object: name, title, tenure, previous_company, linkedin_url, why_matters, conversation_hook, focus_areas (array of 3 strings), background (1-2 sentences), tag (optional e.g. Co-founder)
Only include people found in the data. Include linkedin_url when present in research. Never hallucinate names."""

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

RISKS_CHALLENGES_SYSTEM = """You build a rich Risks & Challenges dashboard for a sales briefing.
Return ONLY valid JSON:
{
  "summary_counts": [
    {"label": "High Risks", "value": 7, "hint": "Require close monitoring", "level": "high"},
    {"label": "Medium Risks", "value": 6, "hint": "Could impact growth", "level": "medium"},
    {"label": "Low Risks", "value": 4, "hint": "Manageable exposure", "level": "low"},
    {"label": "Total Risks", "value": 17, "hint": "Across all categories", "level": "medium"}
  ],
  "overall_risk_level": "high",
  "overall_status": "Needs active management",
  "risk_trend": [
    {"month": "Jan", "level": "medium", "score": 2},
    {"month": "Feb", "level": "medium", "score": 2},
    {"month": "Mar", "level": "high", "score": 3},
    {"month": "Apr", "level": "high", "score": 3},
    {"month": "May", "level": "high", "score": 3},
    {"month": "Jun", "level": "high", "score": 3}
  ],
  "top_risks": [
    {
      "title": "Dependence on Online Payments Growth",
      "description": "Short risk description",
      "category": "Market",
      "impact": "high",
      "likelihood": "high",
      "trend": [2, 2, 3, 3, 3, 3],
      "mitigation_status": "Monitoring"
    }
  ],
  "categories": [
    {"name": "Market", "percent": 30, "count": 5},
    {"name": "Regulatory", "percent": 25, "count": 4}
  ],
  "heat_map": [
    {"impact": "high", "likelihood": "high", "count": 3}
  ],
  "detailed_insights": [
    {
      "title": "Risk title",
      "description": "Detailed paragraph",
      "potential_impact": "high",
      "time_horizon": "1-2 years",
      "mitigation": "Action to mitigate",
      "level": "high"
    }
  ],
  "key_challenges": ["Global expansion while maintaining local compliance"]
}
Provide exactly 4 summary_counts, 6 risk_trend months, 8-12 top_risks, 4-5 categories,
9 heat_map cells (all impact x likelihood combos), 6+ detailed_insights, 4-6 key_challenges.
impact/likelihood/level: high | medium | low. mitigation_status: In Progress | Monitoring | Mitigated | Not Started.
Use only risks supported by research. Do not fabricate specific lawsuits or fines."""

BUSINESS_SIGNALS_SYSTEM = """You build a rich Business Signals dashboard for a sales briefing.
Return ONLY valid JSON:
{
  "summary_counts": [
    {"label": "Positive Signals", "value": 32, "hint": "Strong growth indicators", "polarity": "positive"},
    {"label": "Neutral Signals", "value": 5, "hint": "Stable or mixed trends", "polarity": "neutral"},
    {"label": "Risk Signals", "value": 2, "hint": "Potential concerns", "polarity": "risk"}
  ],
  "overall_strength": {
    "score": 85,
    "label": "Strong",
    "change": "+7 pts",
    "change_label": "Improved vs last month"
  },
  "signal_trend": [
    {"month": "Jan '26", "score": 72},
    {"month": "Feb '26", "score": 75}
  ],
  "key_signals": [
    {
      "title": "Strong Revenue Growth",
      "category": "Financial",
      "description": "1-2 sentence signal description",
      "impact": "high",
      "indicator": "ARR Growth: 22% YoY",
      "trend": [60, 65, 70, 75, 80, 85],
      "polarity": "positive"
    }
  ],
  "categories": [
    {"name": "Growth", "percent": 41, "count": 16},
    {"name": "Market", "percent": 23, "count": 9}
  ],
  "recent_developments": [
    {
      "date": "Jun 10, 2026",
      "title": "Launched AI-powered fraud detection",
      "description": "Brief development summary",
      "category": "Product"
    }
  ],
  "top_positive_signals": [
    {"title": "Strong Revenue Growth", "metric": "ARR +22% YoY", "impact": "high", "polarity": "positive"}
  ],
  "key_risk_signals": [
    {"title": "Increased Competition", "metric": "New entrants in core markets", "impact": "high", "polarity": "risk"}
  ]
}
Provide exactly 3 summary_counts, 6 signal_trend months, 10-15 key_signals across categories
(Growth, Market, Product, Financial, Partnerships), 5 categories, 5-6 recent_developments,
3 top_positive_signals, 2-3 key_risk_signals. impact: high | medium | low. polarity: positive | neutral | risk.
Use only signals supported by research."""

STAKEHOLDERS_OVERVIEW_SYSTEM = """You build a rich Stakeholders dashboard for a sales briefing.
Return ONLY valid JSON:
{
  "summary_counts": [
    {"label": "Key Stakeholders Identified", "value": 0, "hint": "Across all groups"},
    {"label": "Executive Leaders", "value": 0, "hint": "C-Level"},
    {"label": "Board Members", "value": 0, "hint": "Active"},
    {"label": "Key Partnerships", "value": 0, "hint": "Strategic"}
  ],
  "groups": [
    {"name": "Executive Leadership", "percent": 0, "count": 0},
    {"name": "Board of Directors", "percent": 0, "count": 0}
  ],
  "executives": [
    {
      "name": "Full Name",
      "title": "CEO",
      "tag": "",
      "focus_areas": ["Area from research"],
      "background": "1-2 sentence professional background from research",
      "linkedin_url": ""
    }
  ],
  "board_members": [{"name": "Full Name", "role": "Director", "linkedin_url": "", "image_url": ""}],
  "investors": [{"name": "Firm Name", "type": "investor", "website": ""}],
  "partners": [{"name": "Partner Name", "type": "partner", "website": ""}],
  "other_groups": [
    {"label": "Employees", "description": "From research only"}
  ]
}
CRITICAL RULES:
- Use ONLY stakeholders found in the provided research, Apollo people, and scraped pages.
- NEVER invent or guess names, investors, partners, or board members.
- If a category has no supporting evidence, return an empty array [] for that field.
- summary_counts values and groups counts MUST match the actual arrays you return.
- Provide up to 4 summary_counts, up to 5 groups, 5-7 executives, 4-5 board_members, 4-5 investors,
  4-5 partners, up to 5 other_groups — only when supported by evidence.
- Include linkedin_url and website when explicitly found in research; use empty string if unknown."""
