from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Creates a local SQLite database file named 'recruit.db'
SQLALCHEMY_DATABASE_URL = "sqlite:///./recruit.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False} # Needed for SQLite + FastAPI
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency used in your jobs.py
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()