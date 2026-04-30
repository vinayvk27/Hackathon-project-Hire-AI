import os
import json
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from openai import OpenAI

from app.database import get_db
from app.models import Job

router = APIRouter()

_openai = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

_INTERNAL_MATCH_PROMPT = """\
You are an internal talent-placement engine. Given a job description and an \
employee's skills summary, assess how well the employee fits the role.

Return ONLY valid JSON with exactly these keys:
{
  "score": <integer 0-100>,
  "reasoning": "<2-3 sentence explanation>"
}
"""


class MatchRequest(BaseModel):
    job_id: int


def _score_employee(skills_summary: str, jd_text: str) -> dict:
    """Score one bench employee against a JD. Returns {score, reasoning}."""
    try:
        response = _openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": _INTERNAL_MATCH_PROMPT},
                {"role": "user", "content": f"JOB DESCRIPTION:\n{jd_text}\n\nEMPLOYEE SKILLS:\n{skills_summary}"},
            ],
            temperature=0.1,
        )
        content = response.choices[0].message.content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        return json.loads(content)
    except Exception as e:
        return {"score": 0, "reasoning": f"Evaluation failed: {e}"}

BENCH_EMPLOYEES = [
    {
        "id": "bench-001",
        "name": "Aryan Mehta",
        "email": "aryan.mehta@company.internal",
        "status": "on_bench",
        "skills_summary": (
            "Senior full-stack engineer with 5 years of experience building production-grade "
            "web applications. Expert in Python and FastAPI for high-performance REST APIs, "
            "React and TypeScript on the frontend, and PostgreSQL/MongoDB for data storage. "
            "Strong background in Docker, Kubernetes, CI/CD pipelines, and AWS deployments. "
            "Has led teams of 3–5 engineers and is comfortable with agile/scrum workflows. "
            "Previously built an internal HR automation tool using LangChain and ChromaDB."
        ),
    },
    {
        "id": "bench-002",
        "name": "Sneha Iyer",
        "email": "sneha.iyer@company.internal",
        "status": "on_bench",
        "skills_summary": (
            "Data engineer with 4 years of experience specialising in ETL pipeline design, "
            "Apache Spark, and dbt. Proficient in Python for data processing and scripting, "
            "SQL (BigQuery, Snowflake), and Airflow for workflow orchestration. Familiar with "
            "Tableau and Looker for BI dashboards. Has worked on large-scale data migration "
            "projects and real-time streaming with Kafka. Limited frontend experience."
        ),
    },
    {
        "id": "bench-003",
        "name": "Kiran Reddy",
        "email": "kiran.reddy@company.internal",
        "status": "on_bench",
        "skills_summary": (
            "Backend developer with 3 years of experience in Node.js, Express, and GraphQL. "
            "Good understanding of relational databases (MySQL, PostgreSQL) and Redis caching. "
            "Some exposure to React for internal tooling. Familiar with Jest and Cypress for "
            "testing. Has integrated third-party payment gateways (Razorpay, Stripe) and worked "
            "on microservices architecture. Currently upskilling in Python and FastAPI."
        ),
    },
]


@router.get("/bench")
def get_bench_employees():
    """Return all internal employees currently on the bench."""
    return BENCH_EMPLOYEES


@router.post("/match")
def match_internal_candidates(payload: MatchRequest, db: Session = Depends(get_db)):
    """
    Score every bench employee against the saved JD and return ranked matches.
    Payload: {"job_id": <int>}
    """
    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {payload.job_id} not found")

    jd_text = f"{job.title}\n\n{job.description}"

    results = []
    for emp in BENCH_EMPLOYEES:
        evaluation = _score_employee(emp["skills_summary"], jd_text)
        results.append({
            "name": emp["name"],
            "score": evaluation.get("score", 0),
            "reasoning": evaluation.get("reasoning", ""),
        })

    results.sort(key=lambda x: x["score"], reverse=True)
    return results
