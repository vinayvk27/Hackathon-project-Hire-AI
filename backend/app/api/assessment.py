import os
import re
import secrets
import string
import smtplib
import logging
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
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

logger = logging.getLogger(__name__)

router = APIRouter()

# ── SMTP Config ───────────────────────────────────────────────────────────────

SMTP_EMAIL    = os.getenv("SMTP_EMAIL", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_HOST     = "smtp.gmail.com"
SMTP_PORT     = 587


def _generate_password(length: int = 8) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def _invitation_html(candidate_name: str, job_title: str, username: str, temp_password: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body{{font-family:'Segoe UI',Arial,sans-serif;background:#f0f4f8;margin:0;padding:0;}}
  .wrap{{max-width:600px;margin:40px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.10);}}
  .hdr{{background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);padding:40px 40px 32px;}}
  .hdr-tag{{color:#60a5fa;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px;}}
  .hdr h1{{color:#f8fafc;font-size:22px;font-weight:700;margin:0 0 8px;line-height:1.3;}}
  .hdr p{{color:#94a3b8;font-size:12px;margin:0;}}
  .body{{padding:36px 40px;}}
  .greeting{{color:#0f172a;font-size:15px;font-weight:600;margin:0 0 6px;}}
  .intro{{color:#475569;font-size:14px;line-height:1.7;margin:0 0 24px;}}
  .role-box{{background:#f0f9ff;border:1px solid #bae6fd;border-left:4px solid #0284c7;border-radius:6px;padding:16px 20px;margin-bottom:24px;}}
  .role-box .lbl{{font-size:10px;color:#0284c7;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;}}
  .role-box .val{{font-size:17px;color:#0c4a6e;font-weight:700;}}
  .cred-box{{background:#0f172a;border-radius:8px;padding:24px;margin-bottom:24px;}}
  .cred-box .cred-title{{color:#64748b;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 16px;}}
  .cred-row{{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #1e293b;}}
  .cred-row:last-child{{border-bottom:none;}}
  .cred-lbl{{color:#64748b;font-size:12px;font-weight:600;}}
  .cred-val{{color:#f1f5f9;font-family:'Courier New',monospace;font-size:13px;font-weight:700;background:#1e293b;padding:4px 10px;border-radius:4px;}}
  .cta{{display:block;text-align:center;background:#0284c7;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-weight:700;font-size:14px;margin-bottom:24px;}}
  .warn{{background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:14px 18px;margin-bottom:24px;}}
  .warn p{{color:#92400e;font-size:13px;margin:0;line-height:1.6;}}
  .footer{{background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 40px;}}
  .footer p{{color:#94a3b8;font-size:11px;margin:0;line-height:1.6;}}
</style>
</head>
<body>
<div class="wrap">
  <div class="hdr">
    <div class="hdr-tag">Internal Mobility Programme &nbsp;|&nbsp; Confidential</div>
    <h1>You've Been Selected for an AI-Matched Opportunity</h1>
    <p>This communication contains access credentials. Handle with care.</p>
  </div>
  <div class="body">
    <p class="greeting">Dear {candidate_name},</p>
    <p class="intro">
      Following a comprehensive AI-driven analysis of your professional profile and competency record,
      our internal talent placement engine has identified you as a high-fit candidate for a current
      opening within the organisation. We are pleased to extend this invitation to complete our secure
      online assessment as the next step in this internal mobility opportunity.
    </p>
    <div class="role-box">
      <div class="lbl">Position Matched To Your Profile</div>
      <div class="val">{job_title}</div>
    </div>
    <p class="intro">
      Please access the assessment portal using the credentials below. Complete the assessment from
      a private, secure environment. Your responses are monitored for integrity assurance.
    </p>
    <div class="cred-box">
      <p class="cred-title">Your Secure Access Credentials</p>
      <div class="cred-row">
        <span class="cred-lbl">Assessment Portal</span>
        <span class="cred-val">localhost:5173/assessment/login</span>
      </div>
      <div class="cred-row">
        <span class="cred-lbl">Username</span>
        <span class="cred-val">{username}</span>
      </div>
      <div class="cred-row">
        <span class="cred-lbl">Temporary Password</span>
        <span class="cred-val">{temp_password}</span>
      </div>
    </div>
    <a href="http://localhost:5173/assessment/login" class="cta">Access Assessment Portal &rarr;</a>
    <div class="warn">
      <p>
        <strong>Security Notice:</strong> These credentials are unique to you and must not be shared,
        forwarded, or stored in unsecured systems. Any unauthorised access attempt will be logged and
        may result in immediate disqualification from this process. If you did not expect this
        communication, contact your HR business partner immediately.
      </p>
    </div>
  </div>
  <div class="footer">
    <p>
      This is a confidential communication from the <strong>Internal Talent Placement Division</strong>.
      Do not reply to this email. For support, contact your HR business partner through official channels.
    </p>
  </div>
</div>
</body>
</html>"""


def _send_invitation_email(
    to_email: str,
    candidate_name: str,
    job_title: str,
    username: str,
    temp_password: str,
) -> None:
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        logger.warning("SMTP credentials not configured — skipping email to %s", to_email)
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[Confidential] Assessment Invitation — {job_title} | Internal Mobility"
    msg["From"]    = SMTP_EMAIL
    msg["To"]      = to_email
    msg.attach(MIMEText(_invitation_html(candidate_name, job_title, username, temp_password), "html"))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.sendmail(SMTP_EMAIL, to_email, msg.as_string())
        logger.info("Invitation email sent to %s", to_email)


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

class InternalCandidateItem(BaseModel):
    name:   str
    email:  str
    job_id: int

class NotifyRequest(BaseModel):
    candidates: List[InternalCandidateItem]

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


@router.post("/candidates/notify")
def notify_internal_candidates(request: NotifyRequest, db: Session = Depends(get_db)):
    """
    Authorize AI-recommended internal bench candidates: generate credentials,
    persist to DB, and dispatch professional HTML invitation emails via SMTP.
    Email failures are logged but never surface as HTTP errors.
    """
    results = []

    for item in request.candidates:
        temp_password = _generate_password(8)
        username_base = re.sub(r"[^a-z0-9]+", "_", item.name.lower()).strip("_")

        existing = db.query(Candidate).filter(Candidate.email == item.email).first()
        if existing:
            existing.password      = temp_password
            existing.password_hash = temp_password
            existing.status        = "Shortlisted"
            candidate = existing
        else:
            username = username_base
            if db.query(Candidate).filter(Candidate.username == username).first():
                suffix   = "".join(secrets.choice(string.digits) for _ in range(4))
                username = f"{username_base}_{suffix}"
            candidate = Candidate(
                name          = item.name,
                email         = item.email,
                username      = username,
                password      = temp_password,
                password_hash = temp_password,
                resume_source = "internal",
                job_id        = item.job_id,
                match_score   = 0.0,
                status        = "Shortlisted",
            )
            db.add(candidate)

        db.commit()
        db.refresh(candidate)

        job       = db.query(Job).filter(Job.id == item.job_id).first()
        job_title = job.title if job else "Internal Role"

        email_sent = True
        try:
            _send_invitation_email(
                to_email       = item.email,
                candidate_name = item.name,
                job_title      = job_title,
                username       = candidate.username,
                temp_password  = temp_password,
            )
        except Exception as exc:
            logger.error("Failed to send invitation email to %s: %s", item.email, exc)
            email_sent = False

        results.append({
            "name":       item.name,
            "email":      item.email,
            "username":   candidate.username,
            "email_sent": email_sent,
        })

    return {
        "message": (
            f"Credentials generated for {len(results)} candidate(s). "
            "Assessment invitations dispatched."
        ),
        "results": results,
    }


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
