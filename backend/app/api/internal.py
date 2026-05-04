import logging

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Job
from app.services.llm_evaluator import evaluate_candidate
from app.services.mcp_router import route_jd_intent, get_system_prompt_by_domain
from app.services.score_cache import get_score, set_score

logger = logging.getLogger(__name__)

router = APIRouter()


class MatchRequest(BaseModel):
    job_id: int


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
    Results are written to score_cache on first call; subsequent calls are cache hits.
    Payload: {"job_id": <int>}
    Response shape: [{"name": str, "score": int, "reasoning": str}]  — unchanged.
    """
    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {payload.job_id} not found")

    job_id = payload.job_id
    skills_clause = ", ".join(job.required_skills or [])
    jd_text = f"{job.title}\n\n{job.description}"
    if skills_clause:
        jd_text += f"\nRequired Skills: {skills_clause}"

    domain        = route_jd_intent(jd_text)
    system_prompt = get_system_prompt_by_domain(domain)

    results: list[dict] = []
    cache_hits = cache_misses = 0

    for emp in BENCH_EMPLOYEES:
        ckey   = f"internal:{emp['id']}"
        cached = get_score(db, job_id, ckey)

        if cached:
            cache_hits += 1
            llm_eval = cached["evaluation"]
        else:
            cache_misses += 1
            llm_eval = evaluate_candidate(emp["skills_summary"], jd_text, system_prompt)
            set_score(
                db, job_id, ckey, "internal",
                float(llm_eval.get("overall_score", 0)),
                llm_eval,
            )

        results.append({
            "name":      emp["name"],
            "score":     llm_eval.get("overall_score", 0),
            "reasoning": llm_eval.get("summary", ""),
        })

    logger.info(
        "/match/internal job_id=%d: cache_hits=%d, cache_misses=%d, llm_calls=%d",
        job_id, cache_hits, cache_misses, cache_misses,
    )

    results.sort(key=lambda x: x["score"], reverse=True)
    return results
