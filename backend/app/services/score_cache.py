import json

from sqlalchemy.orm import Session

from app.models.match_score_cache import MatchScoreCache


def get_score(db: Session, job_id: int, candidate_key: str) -> dict | None:
    """Return cached evaluation for (job_id, candidate_key), or None on miss."""
    row = (
        db.query(MatchScoreCache)
        .filter_by(job_id=job_id, candidate_key=candidate_key)
        .first()
    )
    if row is None:
        return None
    return {
        "source":     row.source,
        "score":      row.score,
        "evaluation": json.loads(row.evaluation_json),
    }


def set_score(
    db: Session,
    job_id: int,
    candidate_key: str,
    source: str,
    score: float,
    evaluation: dict,
) -> None:
    """Upsert a scored evaluation into the cache."""
    row = (
        db.query(MatchScoreCache)
        .filter_by(job_id=job_id, candidate_key=candidate_key)
        .first()
    )
    if row:
        row.source          = source
        row.score           = score
        row.evaluation_json = json.dumps(evaluation)
    else:
        db.add(
            MatchScoreCache(
                job_id=job_id,
                candidate_key=candidate_key,
                source=source,
                score=score,
                evaluation_json=json.dumps(evaluation),
            )
        )
    db.commit()


def get_all_scores_for_job(db: Session, job_id: int) -> list[dict]:
    """Return all cached rows for a given job, in insertion order."""
    rows = db.query(MatchScoreCache).filter_by(job_id=job_id).all()
    return [
        {
            "candidate_key": row.candidate_key,
            "source":        row.source,
            "score":         row.score,
            "evaluation":    json.loads(row.evaluation_json),
        }
        for row in rows
    ]


def invalidate_job(db: Session, job_id: int) -> int:
    """Delete all cached scores for a job. Returns the number of rows removed."""
    deleted = (
        db.query(MatchScoreCache)
        .filter(MatchScoreCache.job_id == job_id)
        .delete(synchronize_session=False)
    )
    db.commit()
    return deleted
