"""
Two-stage pool matcher:
  Stage 1 — vector similarity >= VECTOR_THRESHOLD (via pool_vector_store)
  Stage 2 — LLM evaluation via evaluate_candidate (score >= LLM_THRESHOLD)

Results are written to match_score_cache with source = pool source name.
Cache keys: "{source}:{filename}"  (e.g. "linkedin:john_doe.pdf")
"""
import logging

from app.database import SessionLocal
from app.models import Job
from app.services.pool_vector_store import (
    POOL_SOURCES,
    fetch_resume_from_pool,
    query_pool,
    similarity_pct,
)
from app.services.score_cache import get_score, set_score
from app.services.llm_evaluator import evaluate_candidate
from app.services.mcp_router import get_system_prompt_by_domain, route_jd_intent

logger = logging.getLogger(__name__)

VECTOR_THRESHOLD = 70.0
LLM_THRESHOLD    = 70.0
N_PER_SOURCE     = 50


def match_jd_against_pools(job_id: int) -> dict:
    """
    Run two-stage match for one JD across all 5 pool sources.
    Opens its own DB session (safe for use as a BackgroundTask).
    Writes qualified results to match_score_cache.
    """
    logger.info(f"[pool_matcher] STARTED for job_id={job_id}")
    db = SessionLocal()
    try:
        jd = db.query(Job).filter(Job.id == job_id).first()
        if not jd:
            return {"skipped": True, "reason": "job_not_found"}

        status = getattr(jd, "status", "Open") or "Open"
        if status != "Open":
            logger.info(
                f"[pool_matcher] event=jd_match job_id={job_id} "
                f"status={status} skipping"
            )
            return {"skipped": True, "reason": "job_not_open"}

        jd_text = (
            f"{jd.title}\n{jd.description}\n"
            f"Required Skills: {', '.join(jd.required_skills or [])}"
        )
        domain = route_jd_intent(jd_text)
        system_prompt = get_system_prompt_by_domain(domain)

        totals = {"vector_passed": 0, "llm_evaluated": 0, "llm_qualified": 0}

        for source in POOL_SOURCES:
            candidates = query_pool(source, jd_text, n_results=N_PER_SOURCE)

            # Deduplicate: keep only the best-matching chunk per filename
            best_per_file: dict[str, dict] = {}
            for c in candidates:
                fname = c["metadata"].get("filename", "")
                if not fname:
                    continue
                if fname not in best_per_file or c["distance"] < best_per_file[fname]["distance"]:
                    best_per_file[fname] = c

            for filename, c in best_per_file.items():
                sim = similarity_pct(c["distance"])
                if sim < VECTOR_THRESHOLD:
                    continue
                totals["vector_passed"] += 1

                cache_key = f"{source}:{filename}"

                cached = get_score(db, job_id, cache_key)
                if cached:
                    eval_result = cached.get("evaluation", {})
                else:
                    full_text = fetch_resume_from_pool(source, filename) or c["document"]
                    eval_result = evaluate_candidate(
                        resume_text=full_text,
                        jd_text=jd_text,
                        system_prompt=system_prompt,
                    )
                    try:
                        set_score(
                            db, job_id, cache_key, source,
                            eval_result.get("overall_score", 0),
                            eval_result,
                        )
                        logger.info(
                            f"[pool_matcher] event=cache_write job_id={job_id} "
                            f"key={cache_key} source={source}"
                        )
                    except Exception as e:
                        logger.error(f"[pool_matcher] cache write failed: {e}")
                    totals["llm_evaluated"] += 1

                if eval_result.get("overall_score", 0) >= LLM_THRESHOLD:
                    totals["llm_qualified"] += 1

        logger.info(f"[pool_matcher] event=jd_match job_id={job_id} totals={totals}")
        return totals
    finally:
        db.close()


def match_resume_against_open_jds(source: str, filename: str) -> dict:
    """
    Triggered when a new resume is uploaded to a pool.
    Scores this single resume against every Open JD (skips cache hits).
    Opens its own DB session (safe for use as a BackgroundTask).
    """
    db = SessionLocal()
    try:
        open_jobs = db.query(Job).filter(Job.status == "Open").all()
        resume_text = fetch_resume_from_pool(source, filename)
        cache_key = f"{source}:{filename}"

        matched = 0
        for jd in open_jobs:
            cached = get_score(db, jd.id, cache_key)
            if cached:
                continue

            jd_text = (
                f"{jd.title}\n{jd.description}\n"
                f"Required Skills: {', '.join(jd.required_skills or [])}"
            )
            domain = route_jd_intent(jd_text)
            system_prompt = get_system_prompt_by_domain(domain)

            eval_result = evaluate_candidate(
                resume_text=resume_text,
                jd_text=jd_text,
                system_prompt=system_prompt,
            )
            try:
                set_score(
                    db, jd.id, cache_key, source,
                    eval_result.get("overall_score", 0),
                    eval_result,
                )
                logger.info(
                    f"[pool_matcher] event=cache_write job_id={jd.id} "
                    f"key={cache_key} source={source}"
                )
            except Exception as e:
                logger.error(f"[pool_matcher] cache write failed: {e}")
            matched += 1

        logger.info(
            f"[pool_matcher] event=resume_match source={source} "
            f"file={filename} matched_against={matched}"
        )
        return {"matched_against_jobs": matched}
    finally:
        db.close()
