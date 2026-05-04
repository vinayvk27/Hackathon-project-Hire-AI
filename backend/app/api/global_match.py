import logging

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.global_matcher import run_global_match
from app.services.score_cache import invalidate_job

logger = logging.getLogger(__name__)

router = APIRouter()


class GlobalMatchRequest(BaseModel):
    job_id:    int
    threshold: float = 80.0
    limit:     int   = 5


@router.post("/global")
def global_match(payload: GlobalMatchRequest, db: Session = Depends(get_db)):
    """
    POST /api/match/global
    Body: {"job_id": 3, "threshold": 80.0, "limit": 5}

    Read-only endpoint: returns ALL cached scores for a job (internal, external,
    and all pool sources), applies threshold, sorts descending, and slices to
    `limit`. Makes ZERO LLM calls — if a candidate isn't in the cache they don't
    appear.

    Run /api/internal/match, /api/external/match, or /pool/upload to populate
    the cache.
    """
    result = run_global_match(
        job_id=payload.job_id,
        threshold=payload.threshold,
        limit=payload.limit,
        db=db,
    )
    if result is None:
        raise HTTPException(status_code=404, detail=f"Job {payload.job_id} not found")

    logger.info(
        "/match/global job_id=%d: cache_hits=%d, cache_misses=0, llm_calls=0",
        payload.job_id, result.get("total_evaluated", 0),
    )
    return result


@router.post("/cache/invalidate")
def invalidate_cache(job_id: int, db: Session = Depends(get_db)):
    """
    POST /api/match/cache/invalidate?job_id=<id>

    Deletes all cached scores for the given job. On the next call to
    /match/internal or /match/external the candidates will be re-evaluated.
    """
    deleted = invalidate_job(db, job_id)
    logger.info("/match/cache/invalidate job_id=%d: deleted=%d rows", job_id, deleted)
    return {"deleted": deleted}
