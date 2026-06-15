import pytest

from app.providers import OpenAIClient


def test_parse_json_repairs_invalid_unicode_escape():
    client = OpenAIClient()
    text = '{"company_overview": "Uses \\u12 bad escape"}'
    parsed = client._parse_json_response(text)
    assert "company_overview" in parsed


def test_parse_json_extracts_object_from_wrapped_text():
    client = OpenAIClient()
    text = 'Here is the report:\n{"quality_score": 0.8}\nDone.'
    parsed = client._parse_json_response(text)
    assert parsed["quality_score"] == 0.8
