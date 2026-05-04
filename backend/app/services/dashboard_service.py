from collections import defaultdict

from app.database import SessionLocal
from app.models import Job, Candidate

STAGE_COLORS = {
    "applied":      "#38bdf8",
    "shortlisted":  "#3b82f6",
    "assessed":     "#8b5cf6",
    "interviewing": "#f59e0b",
    "completed":    "#10b981",
    "rejected":     "#f87171",
}

STAGES = ["applied", "shortlisted", "assessed", "interviewing", "completed", "rejected"]


def _pipeline_stage(candidate) -> str:
    if candidate.status == "Rejected":
        return "rejected"
    if candidate.interview_status == "Interview_Complete":
        return "completed"
    if candidate.interview_status in ("Screening_Done", "Tech_Done"):
        return "interviewing"
    if candidate.status == "Assessed":
        return "assessed"
    if candidate.status == "Shortlisted":
        return "shortlisted"
    return "applied"


def get_pipeline_stats() -> dict:
    db = SessionLocal()
    try:
        jobs       = db.query(Job).all()
        candidates = db.query(Candidate).all()

        stage_map    = {c.id: _pipeline_stage(c) for c in candidates}
        stage_counts = {s: 0 for s in STAGES}
        for stage in stage_map.values():
            stage_counts[stage] += 1

        summary = {
            "total_jobs":        len(jobs),
            "total_candidates":  len(candidates),
            # cumulative per spec
            "total_shortlisted": stage_counts["shortlisted"] + stage_counts["assessed"] + stage_counts["interviewing"] + stage_counts["completed"],
            "total_assessed":    stage_counts["assessed"] + stage_counts["interviewing"] + stage_counts["completed"],
            "total_interviewed": stage_counts["interviewing"] + stage_counts["completed"],
            "total_completed":   stage_counts["completed"],
        }

        stage_distribution = [
            {"stage": s, "count": stage_counts[s], "color": STAGE_COLORS[s]}
            for s in STAGES
        ]

        job_candidates: dict[int, list] = defaultdict(list)
        for c in candidates:
            job_candidates[c.job_id].append(c)

        jobs_data = []
        for job in jobs:
            jc                = job_candidates.get(job.id, [])
            job_stage_counts  = {s: 0 for s in STAGES}
            match_scores: list[float] = []
            tech_scores:  list[float] = []

            for c in jc:
                job_stage_counts[stage_map[c.id]] += 1
                if c.match_score is not None:
                    match_scores.append(c.match_score)
                if c.technical_score is not None:
                    tech_scores.append(float(c.technical_score))

            avg_match = round(sum(match_scores) / len(match_scores), 1) if match_scores else 0.0
            avg_tech  = round(sum(tech_scores)  / len(tech_scores),  1) if tech_scores  else 0.0

            jobs_data.append({
                "job_id":           job.id,
                "title":            job.title or "",
                "experience_level": job.experience_level or "",
                "required_skills":  job.required_skills or [],
                "total_candidates": len(jc),
                "stages":           job_stage_counts,
                "avg_match_score":  avg_match,
                "avg_tech_score":   avg_tech,
            })

        return {
            "summary":            summary,
            "stage_distribution": stage_distribution,
            "jobs":               jobs_data,
        }
    finally:
        db.close()
