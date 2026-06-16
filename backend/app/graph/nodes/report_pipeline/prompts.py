"""LLM system prompts for report section generation.

JSON shapes below define FIELD TYPES only. Models must never copy placeholder labels
or example values — derive all content from the provided research context.
"""

_SCHEMA_RULES = """CRITICAL — SCHEMA-ONLY EXAMPLES:
- JSON examples show field names and types, NOT content to copy.
- NEVER use placeholder names, metrics, percentages, or competitor names from the schema.
- Use ONLY facts from the provided research, Apollo firmographics, and scraped pages.
- When evidence is missing, use empty arrays [], empty strings "", or omit optional fields.
- Do not invent customer names, investors, lawsuits, or financial figures."""

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
Max 6 signals, max 4 risks. Every signal needs a specific date from research."""

DISCOVERY_SYSTEM = """Generate discovery questions for a sales call.
Return ONLY valid JSON: {"discovery_questions": [{"question": str, "signal_source": str, "targets": str}]}
Each question must reference a specific signal, date, or person. Open-ended only."""

DISCOVERY_QUESTIONS_OVERVIEW_SYSTEM = f"""You build a rich Discovery Questions dashboard for a sales briefing.
Return ONLY valid JSON:
{{
  "summary_counts": [
    {{"label": str, "value": int, "hint": str}}
  ],
  "priority_mix": [
    {{"name": str, "priority": "high"|"medium"|"low", "count": int, "percent": int}}
  ],
  "categories": [
    {{"name": str, "count": int, "percent": int}}
  ],
  "questions": [
    {{
      "question": str,
      "category": str,
      "priority": "high"|"medium"|"low",
      "rationale": str,
      "potential_impact": "high"|"medium"|"low",
      "signal_source": str,
      "targets": str
    }}
  ]
}}
{_SCHEMA_RULES}
- category: Strategy | Product | Market | Operations | Financial | Partnerships.
- Provide 18-24 questions when evidence supports it; fewer only if research is thin.
- summary_counts, priority_mix, and categories MUST match the questions array.
- Open-ended questions only."""

OUTREACH_SYSTEM = """Write outreach strategy. Return ONLY valid JSON:
{
  "channel": str,
  "primary_contact": str,
  "hook": str,
  "avoid": [str],
  "sequence": [{"day": int, "action": str, "angle": str}],
  "unknowns": [str]
}"""

OUTREACH_OVERVIEW_SYSTEM = f"""You build a rich Outreach Strategies dashboard for a sales briefing.
Return ONLY valid JSON:
{{
  "summary_counts": [
    {{"label": str, "value": int|"High"|"Medium"|"Low", "hint": str}}
  ],
  "expected_impact": {{
    "score": float,
    "max_score": 10,
    "label": str,
    "description": str
  }},
  "strategy_mix": [
    {{"name": str, "percent": int}}
  ],
  "strategies": [
    {{
      "name": str,
      "description": str,
      "best_for": str,
      "primary_channels": [str],
      "effectiveness": "high"|"medium"|"low",
      "effectiveness_score": int,
      "time_to_impact": str
    }}
  ],
  "recommended_channels": [
    {{"name": str, "impact": "high"|"medium"|"low", "score": int}}
  ],
  "outreach_timing": [
    {{"day": "Monday"|"Tuesday"|"Wednesday"|"Thursday"|"Friday", "time": "9AM"|"11AM"|"1PM"|"3PM"|"5PM"|"7PM", "quality": "best"|"good"|"okay"}}
  ],
  "target_personas": [
    {{
      "persona": str,
      "role": str,
      "goal_interest": str,
      "preferred_channels": [str]
    }}
  ],
  "messaging_themes": [
    {{"title": str, "description": str}}
  ],
  "messaging_tips": [str],
  "unknowns": [str]
}}
{_SCHEMA_RULES}
- Base everything on stakeholders, signals, discovery questions, and research.
- Provide 5-6 strategies, 4-6 channels, 4-5 personas, 3-4 themes when evidence supports it.
- strategy_mix percents should sum ~100.
- ALWAYS provide outreach_timing for each weekday × each time slot (30 entries) using B2B best practices.
- ALWAYS provide exactly 4 messaging_tips tied to company context."""

UNKNOWNS_OVERVIEW_SYSTEM = f"""You build a rich Unknowns dashboard for a sales briefing.
Return ONLY valid JSON:
{{
  "summary_counts": [
    {{"label": str, "value": int, "hint": str}}
  ],
  "impact_mix": [
    {{"name": str, "impact": "high"|"medium"|"low", "count": int, "percent": int}}
  ],
  "categories": [
    {{"name": str, "count": int, "percent": int}}
  ],
  "unknown_items": [
    {{
      "unknown": str,
      "category": str,
      "impact": "high"|"medium"|"low",
      "why_it_matters": str,
      "potential_impact": "high"|"medium"|"low",
      "time_horizon": "short-term"|"mid-term"|"long-term"
    }}
  ],
  "time_horizon_mix": [
    {{"name": str, "horizon": "short-term"|"mid-term"|"long-term", "count": int, "percent": int}}
  ],
  "learning_objectives": [
    {{"title": str, "description": str}}
  ],
  "resolution_strategies": [
    {{"title": str, "description": str}}
  ]
}}
{_SCHEMA_RULES}
- category: Strategy | Market | Product | Financial | Operations | Partnerships.
- Provide 12-18 unknown_items when gaps exist; fewer if research is comprehensive.
- All summary/mix fields MUST match unknown_items array.
- learning_objectives: 4 items. resolution_strategies: 4-5 items."""

SOURCES_OVERVIEW_SYSTEM = f"""You build a rich Sources dashboard for a sales briefing.
Return ONLY valid JSON:
{{
  "summary_counts": [
    {{"label": str, "value": int|"str", "hint": str}}
  ],
  "source_type_mix": [
    {{"name": str, "count": int, "percent": int}}
  ],
  "sources": [
    {{
      "title": str,
      "type": str,
      "category": str,
      "reliability": int,
      "accessed_on": str,
      "url": str,
      "snippet": str,
      "is_primary": bool
    }}
  ],
  "category_breakdown": [
    {{"name": str, "count": int}}
  ],
  "reliability_breakdown": [
    {{"stars": int, "label": str, "count": int, "percent": int}}
  ],
  "highlights": [
    {{"title": str, "description": str}}
  ],
  "recent_sources": []
}}
{_SCHEMA_RULES}
- Use ONLY sources from the provided raw_sources list — never invent URLs or titles.
- type: News & Media | Company Documents | Reports & Research | Websites | Social Media.
- category: Financial | Company | News | Industry Research | Product | Stakeholders | Other.
- reliability: integer 1-5. is_primary: true for official company/regulatory sources.
- Include ALL provided sources when possible. highlights: 4 insights from actual counts."""

COMPANY_OVERVIEW_SYSTEM = f"""You build a rich company overview dashboard for a sales briefing.
Return ONLY valid JSON with this shape:
{{
  "description": str,
  "ceo": str,
  "founded": str,
  "headquarters": str,
  "employees": str,
  "company_type": "Private" | "Public",
  "latest_funding": str,
  "valuation": str,
  "key_metrics": [
    {{"label": str, "value": str, "change": str, "change_label": str}}
  ],
  "commercial_trends": [
    {{"label": str, "value": str, "change": str, "trend": [int, int, int, int, int, int, int]}}
  ],
  "commercial_summary": str,
  "market_share": {{"label": str, "value": str, "percent": int}},
  "competitors": [str],
  "industry_standing": [str],
  "growth_signals": [{{"title": str, "detail": str}}],
  "recent_news": [{{"title": str, "source": str, "date": str, "url": str}}],
  "strengths": [str],
  "challenges": [str]
}}
{_SCHEMA_RULES}
- Provide up to 6 key_metrics, 4 commercial_trends (each trend: 7 integers reflecting direction from research), 4 growth_signals, 3 recent_news when evidence exists.
- Use verified firmographics when provided. Omit or empty fields without supporting evidence.
- trend arrays should reflect directional growth/decline inferred from research, not arbitrary numbers."""

PRODUCTS_SERVICES_SYSTEM = f"""You build a rich Products & Services dashboard for a sales briefing.
Use scraped product pages, website content, and research. Return ONLY valid JSON:
{{
  "summary": str,
  "portfolio_metrics": [
    {{"label": str, "value": str}}
  ],
  "categories": [
    {{"name": str, "percent": int}}
  ],
  "core_products": [
    {{
      "name": str,
      "description": str,
      "features": [str],
      "category": str,
      "category_color": "core"|"risk"|"analytics"|"financial"|"compliance"|"default"
    }}
  ],
  "additional_capabilities": [
    {{"name": str, "description": str}}
  ],
  "developer_note": {{
    "title": str,
    "text": str
  }}
}}
{_SCHEMA_RULES}
- Provide up to 4 portfolio_metrics, 4-5 categories (percents sum ~100 when all present), 6-8 core_products, 4-6 additional_capabilities when evidence exists.
- Use only products found in research/scraped pages.
- developer_note.text: empty string if not a developer/product platform company."""

TARGET_CUSTOMERS_SYSTEM = f"""You build a rich Target Customers dashboard for a sales briefing.
Return ONLY valid JSON:
{{
  "summary_metrics": [
    {{"label": str, "value": str, "hint": str}}
  ],
  "business_size_mix": [
    {{"name": str, "range": str, "percent": int}}
  ],
  "segments": [
    {{
      "name": str,
      "description": str,
      "key_needs": [str],
      "example_customers": [str]
    }}
  ],
  "industry_distribution": [
    {{"name": str, "percent": int}}
  ],
  "industry_callout": {{
    "title": str,
    "text": str
  }},
  "geographic_regions": [
    {{"name": str, "percent": int}}
  ],
  "success_summary": str
}}
{_SCHEMA_RULES}
- Use ONLY segments, industries, geographies, and named customers from research.
- If data is unavailable, return empty arrays [] or empty string for success_summary.
- example_customers must be real names cited in research.
- When ICP is described but percentages are missing, provide directional estimates grounded in company category — never copy generic industry benchmarks.
- Return at least 2 segments and 2 summary_metrics only when customer/ICP evidence exists."""

RISKS_CHALLENGES_SYSTEM = f"""You build a rich Risks & Challenges dashboard for a sales briefing.
Return ONLY valid JSON:
{{
  "summary_counts": [
    {{"label": str, "value": int, "hint": str, "level": "high"|"medium"|"low"}}
  ],
  "overall_risk_level": "high"|"medium"|"low",
  "overall_status": str,
  "risk_trend": [
    {{"month": str, "level": "high"|"medium"|"low", "score": int}}
  ],
  "top_risks": [
    {{
      "title": str,
      "description": str,
      "category": str,
      "impact": "high"|"medium"|"low",
      "likelihood": "high"|"medium"|"low",
      "trend": [int, int, int, int, int, int],
      "mitigation_status": "In Progress"|"Monitoring"|"Mitigated"|"Not Started"
    }}
  ],
  "categories": [
    {{"name": str, "percent": int, "count": int}}
  ],
  "heat_map": [
    {{"impact": "high"|"medium"|"low", "likelihood": "high"|"medium"|"low", "count": int}}
  ],
  "detailed_insights": [
    {{
      "title": str,
      "description": str,
      "potential_impact": "high"|"medium"|"low",
      "time_horizon": str,
      "mitigation": str,
      "level": "high"|"medium"|"low"
    }}
  ],
  "key_challenges": [str]
}}
{_SCHEMA_RULES}
- Provide summary_counts, 6 risk_trend months, 8-12 top_risks, categories, heat_map, detailed_insights, key_challenges when risks exist in research.
- Use only risks supported by research. Do not fabricate lawsuits or fines."""

BUSINESS_SIGNALS_SYSTEM = f"""You build a rich Business Signals dashboard for a sales briefing.
Return ONLY valid JSON:
{{
  "summary_counts": [
    {{"label": str, "value": int, "hint": str, "polarity": "positive"|"neutral"|"risk"}}
  ],
  "overall_strength": {{
    "score": int,
    "label": str,
    "change": str,
    "change_label": str
  }},
  "signal_trend": [
    {{"month": str, "score": int}}
  ],
  "key_signals": [
    {{
      "title": str,
      "category": str,
      "description": str,
      "impact": "high"|"medium"|"low",
      "indicator": str,
      "trend": [int, int, int, int, int, int],
      "polarity": "positive"|"neutral"|"risk"
    }}
  ],
  "categories": [
    {{"name": str, "percent": int, "count": int}}
  ],
  "recent_developments": [
    {{
      "date": str,
      "title": str,
      "description": str,
      "category": str
    }}
  ],
  "top_positive_signals": [
    {{"title": str, "metric": str, "impact": "high"|"medium"|"low", "polarity": "positive"}}
  ],
  "key_risk_signals": [
    {{"title": str, "metric": str, "impact": "high"|"medium"|"low", "polarity": "risk"}}
  ]
}}
{_SCHEMA_RULES}
- Provide counts, trends, and signals proportional to evidence in research.
- categories: Growth, Market, Product, Financial, Partnerships as applicable.
- Use only signals supported by research."""

STAKEHOLDERS_OVERVIEW_SYSTEM = f"""You build a rich Stakeholders dashboard for a sales briefing.
Return ONLY valid JSON:
{{
  "summary_counts": [
    {{"label": str, "value": int, "hint": str}}
  ],
  "groups": [
    {{"name": str, "percent": int, "count": int}}
  ],
  "executives": [
    {{
      "name": str,
      "title": str,
      "tag": str,
      "focus_areas": [str],
      "background": str,
      "linkedin_url": str
    }}
  ],
  "board_members": [{{"name": str, "role": str, "linkedin_url": str, "image_url": str}}],
  "investors": [{{"name": str, "type": "investor", "website": str}}],
  "partners": [{{"name": str, "type": "partner", "website": str}}],
  "other_groups": [
    {{"label": str, "description": str}}
  ]
}}
{_SCHEMA_RULES}
- Use ONLY stakeholders from research, Apollo people, and scraped pages.
- NEVER invent names, investors, partners, or board members.
- Empty arrays when no evidence. summary_counts and groups MUST match returned arrays.
- Extract investors from funding mentions. List partners explicitly named in research."""
