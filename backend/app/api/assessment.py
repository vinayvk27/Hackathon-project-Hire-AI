import os
import re
import secrets
import string
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from app.database import SessionLocal, get_db
from app.models import Job, Candidate
from app.models.candidate import generate_candidate_credentials
from app.services.assessment_graph import assessment_app, AssessmentState
from app.services.vector_store import VectorStoreService

router = APIRouter()

# ── Auth Config ───────────────────────────────────────────────────────────────

SECRET_KEY = os.getenv("SECRET_KEY", "hire-ai-candidate-secret-change-in-prod")
ALGORITHM  = "HS256"
TOKEN_EXPIRE_HOURS = 8

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/assessment/login")


def _create_token(candidate_id: int) -> str:
    expire = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)
    return jwt.encode({"sub": str(candidate_id), "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)

def get_current_candidate(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Candidate:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        candidate_id = int(payload.get("sub"))
    except (JWTError, TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate


# ── Request / Response Schemas ────────────────────────────────────────────────

class CandidateRegisterRequest(BaseModel):
    name:          str
    email:         str
    password:      str
    resume_source: str    # PDF filename already in ./uploads/
    job_id:        int
    match_score:   float = 0.0

class CandidateLoginRequest(BaseModel):
    email:    str
    password: str

class ShortlistRequest(BaseModel):
    candidate_id: int

class AnswerItem(BaseModel):
    question_id: int
    question:    str
    answer:      str

class SubmitRequest(BaseModel):
    answers: List[AnswerItem]


# ── Manager Endpoints (no auth required for demo) ─────────────────────────────

@router.post("/candidates/register")
def register_candidate(request: CandidateRegisterRequest, db: Session = Depends(get_db)):
    """Manager creates a candidate account after shortlisting from resume matcher."""
    existing = db.query(Candidate).filter(Candidate.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    _, password = generate_candidate_credentials(request.resume_source)
    username_base = re.sub(r"[^a-z0-9]+", "_", request.name.lower()).strip("_")
    # ensure uniqueness by appending a short random suffix if needed
    username = username_base
    if db.query(Candidate).filter(Candidate.username == username).first():
        suffix = "".join(secrets.choice(string.digits) for _ in range(4))
        username = f"{username_base}_{suffix}"

    candidate = Candidate(
        name          = request.name,
        email         = request.email,
        username      = username,
        password      = password,
        password_hash = request.password,
        resume_source = request.resume_source,
        job_id        = request.job_id,
        match_score   = request.match_score,
        status        = "Applied",
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return {"id": candidate.id, "message": "Candidate registered successfully"}


@router.post("/candidates/shortlist")
def shortlist_candidate(request: ShortlistRequest, db: Session = Depends(get_db)):
    """Manager shortlists a candidate — unlocks assessment access."""
    candidate = db.query(Candidate).filter(Candidate.id == request.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    candidate.status = "Shortlisted"
    db.commit()
    return {"message": f"{candidate.name} has been shortlisted"}


@router.get("/candidates/list")
def list_candidates(job_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Manager views all candidates, optionally filtered by job."""
    query = db.query(Candidate)
    if job_id:
        query = query.filter(Candidate.job_id == job_id)
    candidates = query.all()
    print("DEBUG BACKEND - First candidate:", candidates[0].__dict__ if candidates else "No candidates")
    return [
        {
            "id":               c.id,
            "name":             c.name,
            "email":            c.email,
            "username":         c.username,
            "password":         c.password,
            "resume_source":    c.resume_source,
            "job_id":           c.job_id,
            "match_score":      c.match_score,
            "status":           c.status,
            "technical_score":  c.technical_score,
            "interview_status": getattr(c, "interview_status", "Pending_Screening"),
            "proctoring_score": getattr(c, "proctoring_score", None),
        }
        for c in candidates
    ]


# ── Candidate Auth ────────────────────────────────────────────────────────────

@router.post("/login")
def candidate_login(request: CandidateLoginRequest, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.email == request.email).first()
    if not candidate:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    # Simple demo-ready string match
    if candidate.password != request.password and candidate.password_hash != request.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = _create_token(candidate.id)
    return {
        "access_token": token,
        "token_type":   "bearer",
        "candidate_id": candidate.id,
        "name":         candidate.name,
        "status":       candidate.status,
    }


# ── Assessment Endpoints (candidate-facing) ───────────────────────────────────

@router.get("/start")
def start_assessment(
    candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db),
):
    """
    Triggers the LangGraph Question Generator node.
    Returns 7 personalised questions (3 MCQ + 4 short answer).
    Only accessible if candidate status == 'Shortlisted'.
    """
    if candidate.status not in ("Shortlisted",):
        raise HTTPException(
            status_code=403,
            detail=f"Assessment not available. Your current status is '{candidate.status}'."
        )

    config = {"configurable": {"thread_id": str(candidate.id)}}

    # Check if questions already generated (candidate refreshed the page)
    existing = assessment_app.get_state(config)
    if existing.values and existing.values.get("assessment_questions"):
        questions = existing.values["assessment_questions"]
        # Strip correct_answer before sending to candidate
        return {
            "questions": [
                {k: v for k, v in q.items() if k != "correct_answer"}
                for q in questions
            ]
        }

    # Fetch job description
    job = db.query(Job).filter(Job.id == candidate.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job_description = (
        f"{job.title}\n{job.description}\n"
        f"Required Skills: {', '.join(job.required_skills or [])}"
    )

    # Fetch full resume text from ChromaDB
    resume_text = VectorStoreService.get_full_resume_text(candidate.resume_source)
    if not resume_text:
        raise HTTPException(status_code=404, detail="Resume text not found in vector store")

    # Build initial state and invoke graph (will pause after question_generator)
    initial_state: AssessmentState = {
        "candidate_id":         str(candidate.id),
        "job_id":               candidate.job_id,
        "resume_text":          resume_text,
        "job_description":      job_description,
        "match_score":          candidate.match_score,
        "assessment_questions": [],
        "assessment_answers":   [],
        "technical_score":      None,
        "reasoning_summary":    None,
        "current_step":         "screening",
    }

    assessment_app.invoke(initial_state, config)

    # Get state after interrupt
    state = assessment_app.get_state(config)
    questions = state.values.get("assessment_questions", [])

    # Strip correct_answer from MCQ before returning
    return {
        "questions": [
            {k: v for k, v in q.items() if k != "correct_answer"}
            for q in questions
        ]
    }


@router.post("/submit")
def submit_assessment(
    request: SubmitRequest,
    candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db),
):
    """
    Accepts candidate answers, resumes the LangGraph to run the
    Technical Evaluator node, and returns the score + reasoning.
    """
    if candidate.status not in ("Shortlisted",):
        raise HTTPException(status_code=403, detail="Assessment not available")

    config = {"configurable": {"thread_id": str(candidate.id)}}

    # Verify graph state exists
    state = assessment_app.get_state(config)
    if not state.values:
        raise HTTPException(status_code=400, detail="Assessment not started. Call /assessment/start first.")

    # Update state with answers then resume graph
    answers = [a.model_dump() for a in request.answers]
    assessment_app.update_state(config, {"assessment_answers": answers})
    final = assessment_app.invoke(None, config)

    technical_score   = final.get("technical_score", 0)
    reasoning_summary = final.get("reasoning_summary", "")

    # Persist results to the Candidate row
    candidate.technical_score   = technical_score
    candidate.reasoning_summary = reasoning_summary
    candidate.status            = "Assessed"
    db.commit()

    return {
        "technical_score":   technical_score,
        "reasoning_summary": reasoning_summary,
        "message":           "Assessment complete. Results have been saved.",
    }
