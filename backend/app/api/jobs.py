import logging

from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Optional
from sqlalchemy.orm import Session

from app.models import Job
from app.services.ai_service import generate_jd_questions, generate_structured_jd
from app.services.pool_matcher import match_jd_against_pools
from app.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter()


class IntentRequest(BaseModel):
    intent: str


class GenerateJDRequest(BaseModel):
    intent: str
    answers: Optional[Dict[str, str]] = None


class JobCreateRequest(BaseModel):
    title: str
    description: str
    required_skills: Optional[List[str]] = []
    experience_level: Optional[str] = ""


class StatusUpdateRequest(BaseModel):
    status: str


@router.post("/questions")
def get_jd_questions(request: IntentRequest):
    questions = generate_jd_questions(request.intent)
    return {"questions": questions}


@router.post("/generate")
def generate_jd(request: GenerateJDRequest):
    result = generate_structured_jd(
        intent=request.intent,
        answers=request.answers,
    )
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result


@router.get("/list")
def list_jobs(db: Session = Depends(get_db)):
    jobs = db.query(Job).order_by(Job.id.desc()).all()
    return [
        {
            "id":               job.id,
            "title":            job.title,
            "description":      job.description,
            "required_skills":  job.required_skills or [],
            "experience_level": job.experience_level or "",
            "status":           getattr(job, "status", "Open") or "Open",
        }
        for job in jobs
    ]


@router.post("/create")
def create_job(
    request: JobCreateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    job = Job(
        title=request.title,
        description=request.description,
        required_skills=request.required_skills,
        experience_level=request.experience_level,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    logger.info(f"[jobs] Created job_id={job.id}, scheduling pool match")
    background_tasks.add_task(match_jd_against_pools, job.id)

    return {"id": job.id, "message": "Job created successfully"}


@router.patch("/{job_id}/status")
def update_job_status(
    job_id: int,
    request: StatusUpdateRequest,
    db: Session = Depends(get_db),
):
    allowed = {"Open", "Closed", "Hired"}
    if request.status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"status must be one of {sorted(allowed)}",
        )
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.status = request.status
    db.commit()
    return {"id": job_id, "status": request.status}
