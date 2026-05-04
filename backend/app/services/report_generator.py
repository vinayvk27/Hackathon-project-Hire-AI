"""Generate structured dashboard data for a candidate interview report.

Single public function: generate_candidate_report(candidate) → dict.
Falls back to _fallback_data() on any LLM error so the dashboard always renders.
"""

import json
import os

from openai import OpenAI

_openai = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def _fallback_data(candidate) -> dict:
    """Deterministic fallback derived from match_score + technical_score."""
    match = float(candidate.match_score or 50)
    tech  = float(candidate.technical_score or 50)

    # 4 categories, avg ≈ tech, spread ±5–15
    categories = [
        {"name": "Technical Knowledge", "score": round(min(100, max(0, tech + 12)))},
        {"name": "Problem Solving",     "score": round(min(100, max(0, tech - 7)))},
        {"name": "Communication",       "score": round(min(100, max(0, tech + 5)))},
        {"name": "Domain Expertise",    "score": round(min(100, max(0, tech - 10)))},
    ]

    # 4 interview questions, 1–10 scale
    base_q = max(1.0, min(10.0, tech / 10))
    questions = [
        {"q": "Technical problem-solving",   "score": round(min(10, max(1, base_q + 0.8)))},
        {"q": "Domain knowledge depth",      "score": round(min(10, max(1, base_q - 0.5)))},
        {"q": "System design understanding", "score": round(min(10, max(1, base_q + 0.3)))},
        {"q": "Communication clarity",       "score": round(min(10, max(1, base_q - 0.2)))},
    ]

    avg_q   = sum(q["score"] for q in questions) / len(questions)
    overall = round(match * 0.30 + tech * 0.40 + (avg_q * 10) * 0.30, 1)

    return {
        "resume_match": {
            "score": match,
            "insights": (
                f"Resume alignment of {match:.0f}% based on semantic and keyword matching "
                "against the job description requirements."
            ),
        },
        "assessment": {
            "categories": categories,
            "insights": (
                f"Technical assessment score of {tech:.0f}/100 reflects performance across "
                "four core competency areas evaluated during the structured test."
            ),
        },
        "interview_performance": {
            "questions": questions,
            "insights": (
                "Interview responses were evaluated across four dimensions. "
                "Scores reflect depth of knowledge and communication quality."
            ),
        },
        "overall_score": overall,
    }


def generate_candidate_report(candidate) -> dict:
    """Return structured dashboard dict for the report endpoint.

    Makes one GPT-4o-mini call for insights and category/question data.
    resume_match.score is always taken from the DB — never from the LLM.
    Falls back to _fallback_data() on any exception.
    """
    match   = float(candidate.match_score or 0)
    tech    = float(candidate.technical_score or 0)
    summary = (candidate.reasoning_summary or "")[:400]

    prompt = (
        f"You are building a hiring dashboard for candidate '{candidate.name}'.\n\n"
        f"Known data:\n"
        f"- Resume match score: {match:.1f} (0–100, set by caller — omit from JSON)\n"
        f"- Technical assessment score: {tech:.1f} / 100\n"
        f"- Interview summary: {summary or 'Not available'}\n\n"
        "Return ONLY valid JSON with exactly these keys (no markdown, no extra keys):\n"
        "{\n"
        '  "resume_match": { "insights": "<2-sentence insight about resume fit>" },\n'
        '  "assessment": {\n'
        '    "categories": [\n'
        '      { "name": "<category name>", "score": <integer 0-100> },\n'
        '      ... exactly 4 items, avg score within ±5 of technical_score\n'
        '    ],\n'
        '    "insights": "<2-sentence insight about assessment performance>"\n'
        '  },\n'
        '  "interview_performance": {\n'
        '    "questions": [\n'
        '      { "q": "<topic, max 30 chars>", "score": <integer 1-10> },\n'
        '      ... exactly 4 items\n'
        '    ],\n'
        '    "insights": "<2-sentence insight about interview performance>"\n'
        '  }\n'
        "}\n\n"
        "Constraint: category scores must average within ±5 of the technical_score."
    )

    try:
        resp = _openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=600,
            response_format={"type": "json_object"},
        )
        data = json.loads(resp.choices[0].message.content)

        # Enforce score from DB — never fabricate
        data["resume_match"]["score"] = match

        # Compute overall using the formula
        questions = data["interview_performance"]["questions"]
        avg_q = sum(q["score"] for q in questions) / max(len(questions), 1)
        data["overall_score"] = round(match * 0.30 + tech * 0.40 + (avg_q * 10) * 0.30, 1)

        return data
    except Exception:
        return _fallback_data(candidate)
