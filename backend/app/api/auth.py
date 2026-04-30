import os
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from jose import jwt

from app.database import get_db
from app.models import Candidate

router = APIRouter()

SECRET_KEY = os.getenv("SECRET_KEY", "hire-ai-candidate-secret-change-in-prod")
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 8

# Mock manager accounts for demo
MOCK_MANAGERS = {
    "hw_demo":     {"name": "Vinay",  "department": "Hardware"},
    "design_demo": {"name": "Priya",  "department": "Design"},
    "hr_demo":     {"name": "Rahul",  "department": "HR"},
}
MOCK_MANAGER_PASSWORD = "password123"


class ManagerLoginRequest(BaseModel):
    username: str
    password: str


@router.post("/api/login")
def manager_login(request: ManagerLoginRequest):
    user = MOCK_MANAGERS.get(request.username)
    if not user or request.password != MOCK_MANAGER_PASSWORD:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return {"success": True, "user": user}


def _create_token(candidate_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    return jwt.encode({"sub": str(candidate_id), "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def _create_token_with_claims(claims: dict) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    return jwt.encode({**claims, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/auth/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    if request.username == "admin" and request.password == "admin123":
        token = _create_token_with_claims({"sub": "admin", "role": "hr_manager"})
        return {"access_token": token, "token_type": "bearer", "role": "hr_manager"}

    candidate = db.query(Candidate).filter(Candidate.username == request.username).first()
    is_valid = candidate and (
        request.password == candidate.password
        or request.password == candidate.password_hash
    )
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    token = _create_token(candidate.id)
    return {
        "access_token": token,
        "token_type":   "bearer",
        "candidate_id": candidate.id,
        "name":         candidate.name,
        "status":       candidate.status,
    }