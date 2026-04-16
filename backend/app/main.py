from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from app.api import auth
from app.api import jobs
from app.api import candidates
from app.api import audio
from app.api import assessment
from app.api import interview

from app.database import engine, Base

# This tells SQLAlchemy to create the tables if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get('/')
def read_root():
    return {"message": "HR Recruitment AI Engine"}

# Register auth router
app.include_router(auth.router)
app.include_router(jobs.router, prefix="/jobs")
app.include_router(candidates.router, prefix="/candidates")
app.include_router(audio.router, prefix="/audio")
app.include_router(assessment.router, prefix="/assessment")
app.include_router(interview.router, prefix="/interview")