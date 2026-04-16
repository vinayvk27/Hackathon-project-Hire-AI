from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Optional
from sqlalchemy.orm import Session

from app.models import Job
from app.services.ai_service import generate_jd_questions, generate_structured_jd
from app.database import get_db

router = APIRouter()


class IntentRequest(BaseModel):
    intent: str


class GenerateJDRequest(BaseModel):
    intent: str
    answers: Optional[Dict[str, str]] = None


class JobCreateRequest(BaseModel):
    title: str
    description: str
    required_skills: List[str]
    experience_level: str


@router.post("/questions")
def get_jd_questions(request: IntentRequest):
    """
    Step 1 of the JD creation flow.
    Takes a brief job intent and returns 5 targeted follow-up questions.
    """
    questions = generate_jd_questions(request.intent)
    return {"questions": questions}


@router.post("/generate")
def generate_jd(request: GenerateJDRequest):
    """
    Step 2 of the JD creation flow.
    Takes the original intent + manager's answers to follow-up questions,
    returns a structured JD JSON.
    """
    result = generate_structured_jd(
        intent=request.intent,
        answers=request.answers,
    )
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result


@router.get("/list")
def list_jobs(db: Session = Depends(get_db)):
    """
    Returns all jobs sorted by newest first (descending by id).
    Payload is intentionally light: id and title only.
    """
    jobs = db.query(Job).order_by(Job.id.desc()).all()
    return [{"id": job.id, "title": job.title} for job in jobs]


@router.post("/create")
def create_job(request: JobCreateRequest, db: Session = Depends(get_db)):
    job = Job(
        title=request.title,
        description=request.description,
        required_skills=request.required_skills,
        experience_level=request.experience_level,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return {"id": job.id, "message": "Job created successfully"}
