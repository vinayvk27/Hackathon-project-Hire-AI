import json
import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Job
from app.services.llm_evaluator import evaluate_candidate
from app.services.mcp_router import route_jd_intent, get_system_prompt_by_domain
from app.services.score_cache import get_score, set_score
from app.services.vector_store import VectorStoreService

logger = logging.getLogger(__name__)

router = APIRouter()

ALLOWED_SOURCES = {"linkedin", "naukri", "indeed"}

MOCK_RESUMES_DIR = Path(__file__).parent.parent.parent / "mock_resumes"


def _parse_resume_file(filepath: Path) -> dict | None:
    """Parse a .txt or .json resume file into {name, email, skills_summary}.
    Returns None and logs a warning for unsupported/malformed files."""
    suffix = filepath.suffix.lower()

    if suffix == ".txt":
        text = filepath.read_text(encoding="utf-8").strip()
        name  = filepath.stem.replace("_", " ").title()
        email = ""
        for line in text.splitlines()[:6]:
            lower = line.lower()
            if lower.startswith("name:"):
                name  = line.split(":", 1)[1].strip()
            elif lower.startswith("email:"):
                email = line.split(":", 1)[1].strip()
        return {"name": name, "email": email, "skills_summary": text}

    elif suffix == ".json":
        try:
            data = json.loads(filepath.read_text(encoding="utf-8"))
            resume_text = data.get("resume_text") or data.get("skills_summary") or ""
            if data.get("experience"):
                resume_text = f"Experience: {data['experience']}\n" + resume_text
            if data.get("skills"):
                resume_text = f"Skills: {', '.join(data['skills'])}\n" + resume_text
            return {
                "name":           data.get("name",  filepath.stem.replace("_", " ").title()),
                "email":          data.get("email", ""),
                "skills_summary": resume_text,
            }
        except Exception as exc:
            logger.warning("Skipping malformed JSON resume %s: %s", filepath.name, exc)
            return None

    else:
        logger.warning("Skipping unsupported file format: %s", filepath.name)
        return None


@router.post("/match")
def match_external_candidates(
    source: str,
    job_id: int,
    db: Session = Depends(get_db),
):
    """
    Score mock external resumes from mock_resumes/{source}/ against a job description.

    Query params:
      source  — one of: linkedin | naukri | indeed  (REQUIRED)
      job_id  — must reference an existing job row   (REQUIRED)

    Each resume is ingested into ChromaDB with job-scoped metadata, then scored.
    Results are written to score_cache; subsequent calls for the same resume are
    served from cache with zero LLM calls.

    Response shape: [{name, email, score, reasoning, job_id, job_title, source}] — unchanged.
    """
    if source not in ALLOWED_SOURCES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid source '{source}'. Allowed values: {sorted(ALLOWED_SOURCES)}",
        )

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    source_dir = MOCK_RESUMES_DIR / source
    if not source_dir.exists() or not source_dir.is_dir():
        logger.warning("Mock resumes directory missing: %s", source_dir)
        return []

    skills_clause = ", ".join(job.required_skills or [])
    jd_text = f"{job.title}\n\n{job.description}"
    if skills_clause:
        jd_text += f"\nRequired Skills: {skills_clause}"

    domain        = route_jd_intent(jd_text)
    system_prompt = get_system_prompt_by_domain(domain)

    results:      list[dict] = []
    cache_hits    = cache_misses = 0

    for filepath in sorted(source_dir.iterdir()):
        if filepath.name.startswith("."):
            continue
        if filepath.suffix.lower() not in {".txt", ".json"}:
            logger.warning("Skipping unsupported file: %s", filepath.name)
            continue

        parsed = _parse_resume_file(filepath)
        if not parsed:
            continue

        filename = filepath.name
        ckey     = f"external:{filename}"
        cached   = get_score(db, job_id, ckey)

        if cached:
            cache_hits += 1
            llm_eval = cached["evaluation"]
        else:
            cache_misses += 1
            # Ingest into ChromaDB with job-scoped metadata before scoring
            VectorStoreService.store_text_resume(
                text=parsed["skills_summary"],
                filename=filename,
                job_id=job_id,
            )
            llm_eval = evaluate_candidate(parsed["skills_summary"], jd_text, system_prompt)
            set_score(
                db, job_id, ckey, "external",
                float(llm_eval.get("overall_score", 0)),
                llm_eval,
            )

        results.append({
            "name":      parsed["name"],
            "email":     parsed["email"],
            "score":     llm_eval.get("overall_score", 0),
            "reasoning": llm_eval.get("summary", ""),
            "job_id":    job_id,
            "job_title": job.title,
            "source":    source,
        })

    logger.info(
        "/match/external job_id=%d source=%s: cache_hits=%d, cache_misses=%d, llm_calls=%d",
        job_id, source, cache_hits, cache_misses, cache_misses,
    )

    results.sort(key=lambda x: x["score"], reverse=True)
    return results
