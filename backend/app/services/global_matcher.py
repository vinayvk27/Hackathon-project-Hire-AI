from sqlalchemy.orm import Session

from app.models import Job
from app.services.score_cache import get_all_scores_for_job


def run_global_match(
    job_id: int,
    threshold: float,
    limit: int,
    db: Session,
) -> dict | None:
    """
    Read-only global matcher.

    Reads internal + external scores from score_cache (no LLM calls).
    Callers must have already run /match/internal and /match/external to
    populate the cache for this job_id, otherwise an empty result is returned.

    Returns None when job_id is not found.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        return None

    all_scores = get_all_scores_for_job(db, job_id)

    if not all_scores:
        return {
            "job_id":           job_id,
            "job_title":        job.title,
            "threshold":        threshold,
            "limit":            limit,
            "total_evaluated":  0,
            "total_qualified":  0,
            "matches":          [],
            "message": (
                "No scored candidates yet. "
                "Run /api/internal/match and /api/external/match first."
            ),
        }

    qualified = [row for row in all_scores if row["score"] >= threshold]
    qualified.sort(key=lambda r: r["score"], reverse=True)
    top_matches = qualified[:limit]

    matches = []
    for row in top_matches:
        ev = row["evaluation"]
        matches.append({
            "source":          row["source"],
            "candidate_key":   row["candidate_key"],
            "candidate_name":  ev.get("candidate_name", ""),
            "candidate_email": ev.get("candidate_email", "Not Provided"),
            "overall_score":   row["score"],
            "llm_evaluation":  ev,
        })

    return {
        "job_id":          job_id,
        "job_title":       job.title,
        "threshold":       threshold,
        "limit":           limit,
        "total_evaluated": len(all_scores),
        "total_qualified": len(qualified),
        "matches":         matches,
    }
