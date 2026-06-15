from app.schemas import normalize_report_content


def test_outreach_dict_coerced_to_markdown():
    content = {
        "company_overview": "Acme",
        "products_services": "",
        "target_customers": "",
        "business_signals": "",
        "risks_challenges": "",
        "discovery_questions": [],
        "unknowns": [],
        "outreach_strategy": {
            "recommended_channel": "LinkedIn and Email",
            "hook_sentence": "Recent AI launches are reshaping enterprise web dev.",
            "follow_up_sequence": {
                "Day 1": "Intro email on product launches.",
                "Day 4": "LinkedIn follow-up on funding.",
            },
        },
        "sources": [],
    }
    normalized = normalize_report_content(content)
    outreach = normalized["outreach_strategy"]
    assert "**Channel:** LinkedIn and Email" in outreach
    assert "**Hook:**" in outreach
    assert "**Day 1:**" in outreach
    assert "{" not in outreach
