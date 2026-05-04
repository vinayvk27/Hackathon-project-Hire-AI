from sqlalchemy import Column, Integer, String, JSON
from app.database import Base

class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String)
    required_skills = Column(JSON)
    experience_level = Column(String)
    # Allowed values: "Open", "Closed", "Hired"
    status = Column(String, default="Open", nullable=False, server_default="Open")