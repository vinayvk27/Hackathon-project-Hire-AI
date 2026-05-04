from sqlalchemy import Column, Integer, String, Float, Text, DateTime, func

from app.database import Base


class MatchScoreCache(Base):
    __tablename__ = "match_score_cache"

    job_id          = Column(Integer, primary_key=True)
    candidate_key   = Column(String,  primary_key=True)   # "internal:bench-001" | "external:resume.json"
    source          = Column(String,  nullable=False)      # "internal" | "external"
    score           = Column(Float,   nullable=False)
    evaluation_json = Column(Text,    nullable=False)
    created_at      = Column(DateTime, server_default=func.now())
