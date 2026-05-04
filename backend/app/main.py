from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

from app.api import auth
from app.api import jobs
from app.api import candidates
from app.api import audio
from app.api import assessment
from app.api import interview
from app.api import internal
from app.api import budget
from app.api import external
from app.api import pipeline
from app.api import global_match
from app.api import pool

from app.database import engine, Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    # Backfill status column for databases created before this column was added
    try:
        with engine.connect() as conn:
            conn.execute(
                text("ALTER TABLE jobs ADD COLUMN status VARCHAR NOT NULL DEFAULT 'Open'")
            )
            conn.commit()
    except Exception:
        pass  # Column already exists — safe to ignore
    yield


app = FastAPI(lifespan=lifespan)

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


app.include_router(auth.router)
app.include_router(jobs.router,        prefix="/jobs")
app.include_router(candidates.router,  prefix="/candidates")
app.include_router(audio.router,       prefix="/audio")
app.include_router(assessment.router,  prefix="/assessment")
app.include_router(interview.router,   prefix="/interview")
app.include_router(internal.router,    prefix="/api/internal")
app.include_router(external.router,    prefix="/api/external")
app.include_router(budget.router,      prefix="/api")
app.include_router(pipeline.router,    prefix="/pipeline")
app.include_router(global_match.router,prefix="/api/match")
app.include_router(pool.router,        prefix="/pool")
