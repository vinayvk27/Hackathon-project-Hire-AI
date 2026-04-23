import os
import re
import secrets
import string
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from app.database import Base


def generate_candidate_credentials(filename: str) -> tuple[str, str]:
    """Return (username, password) derived from a resume filename."""
    base = os.path.splitext(os.path.basename(filename))[0]
    username = re.sub(r"[^a-z0-9]+", "_", base.lower()).strip("_")
    alphabet = string.ascii_letters + string.digits
    password = "".join(secrets.choice(alphabet) for _ in range(8))
    return username, password


def username_from_name(candidate_name: str) -> str:
    """Derive a unique username slug from a candidate's full name.

    e.g. "Vinay Kumar" → "vinay_kumar_4f2a"
    """
    slug = re.sub(r"[^a-z0-9]+", "_", candidate_name.lower()).strip("_") or "candidate"
    suffix = secrets.token_hex(2)  # 4-char hex suffix guarantees uniqueness
    return f"{slug}_{suffix}"


class Candidate(Base):
    __tablename__ = "candidates"

    id              = Column(Integer, primary_key=True, index=True)
    name            = Column(String, nullable=False)
    email           = Column(String, unique=True, nullable=False, index=True)
    username        = Column(String, unique=True, nullable=False, index=True)
    password        = Column(String, nullable=False)
    password_hash   = Column(String, nullable=False)

    # Resume linkage
    resume_source   = Column(String, nullable=False)   # PDF filename in ./uploads/
    job_id          = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    match_score     = Column(Float, default=0.0)       # from vector+LLM matching

    # Status lifecycle: Applied → Shortlisted → Assessed → Rejected
    status          = Column(String, default="Applied", nullable=False)

    # Set after assessment
    technical_score = Column(Integer, nullable=True)
    reasoning_summary = Column(Text, nullable=True)

    # Video interview fields
    screening_audio_log = Column(Text, nullable=True)   # JSON conversation log — Priya (HR round)
    tech_audio_log      = Column(Text, nullable=True)   # JSON conversation log — Arjun + Rajesh rounds
    proctoring_score    = Column(Float, nullable=True)  # 0.0–1.0 cheating-risk score
    # interview_status values: Pending_Screening → Screening_Done → Tech_Done → Interview_Complete
    interview_status    = Column(String, default="Pending_Screening", nullable=False)

    created_at      = Column(DateTime, default=datetime.utcnow)
