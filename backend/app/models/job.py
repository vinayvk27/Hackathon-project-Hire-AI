from sqlalchemy import Column, Integer, String, JSON
from app.database import Base

class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String)
    # JSON column is perfect for storing your List[str] of skills
    required_skills = Column(JSON) 
    experience_level = Column(String)