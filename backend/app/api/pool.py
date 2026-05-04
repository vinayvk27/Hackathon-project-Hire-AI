"""
/pool/* endpoints — strictly additive, no existing endpoints touched.

POST /pool/upload      — upload PDFs to a source pool, trigger bg matching
GET  /pool/stats       — resume counts per source
GET  /pool/matches/{job_id} — matched candidates from pools for a JD
"""
import os
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Job
from app.services.pool_vector_store import (
    POOL_SOURCES,
    add_resume_to_pool,
    get_pool_counts,
)
from app.services.pool_matcher import match_resume_against_open_jds, match_jd_against_pools
from app.services.score_cache import get_all_scores_for_job
from app.services.vector_store import _extract_text_from_pdf

router = APIRouter()

_POOL_UPLOAD_DIR = "./pool_uploads"


@router.post("/upload")
async def upload_to_pool(
    background_tasks: BackgroundTasks,
    source: str = Form(...),
    files: List[UploadFile] = File(...),
):
    """
    Upload PDF resumes to a source-specific pool collection.
    Triggers background matching against all Open JDs for each uploaded file.
    """
    if source not in POOL_SOURCES:
        raise HTTPException(
            status_code=400,
            detail=f"source must be one of {POOL_SOURCES}",
        )

    os.makedirs(_POOL_UPLOAD_DIR, exist_ok=True)

    uploaded: list[str] = []
    skipped:  list[str] = []

    for file in files:
        if not (file.filename or "").lower().endswith(".pdf"):
            skipped.append(file.filename or "unknown")
            continue
        try:
            file_path = os.path.join(_POOL_UPLOAD_DIR, file.filename)
            content = await file.read()
            with open(file_path, "wb") as fh:
                fh.write(content)

            resume_text = _extract_text_from_pdf(file_path)
            add_resume_to_pool(source, file.filename, resume_text)
            uploaded.append(file.filename)

            background_tasks.add_task(
                match_resume_against_open_jds, source, file.filename
            )
        except Exception:
            skipped.append(file.filename or "unknown")

    return {"source": source, "uploaded": uploaded, "skipped": skipped}


@router.post("/match/{job_id}")
def trigger_pool_match(job_id: int):
    """
    Admin/debug: synchronously run pool matching for a single JD.
    Use this to backfill jobs that were created before the background trigger worked.
    Returns the totals dict from match_jd_against_pools.
    """
    result = match_jd_against_pools(job_id)
    if result.get("skipped") and result.get("reason") == "job_not_found":
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return result


@router.get("/stats")
def pool_stats():
    """Return the number of unique resumes stored per pool source."""
    return get_pool_counts()


@router.get("/matches/{job_id}")
def get_pool_matches(job_id: int, db: Session = Depends(get_db)):
    """
    Return all pool-sourced match results for a JD, grouped by source.
    Excludes legacy 'internal' / 'external' cache entries so this section
    stays clean from the older flows.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    all_scores = get_all_scores_for_job(db, job_id)
    pool_entries = [s for s in all_scores if s["source"] in POOL_SOURCES]

    by_source: dict[str, list] = {src: [] for src in POOL_SOURCES}
    for entry in pool_entries:
        src = entry["source"]
        if src in by_source:
            by_source[src].append({
                "candidate_key": entry["candidate_key"],
                "score":         entry["score"],
                "evaluation":    entry["evaluation"],
            })

    for src in by_source:
        by_source[src].sort(key=lambda x: x["score"], reverse=True)

    totals = {
        "total":     len(pool_entries),
        "by_source": {src: len(items) for src, items in by_source.items()},
    }

    return {
        "job_id":    job_id,
        "status":    getattr(job, "status", "Open") or "Open",
        "by_source": by_source,
        "totals":    totals,
    }
