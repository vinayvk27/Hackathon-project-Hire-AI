from fastapi import APIRouter
from app.services.dashboard_service import get_pipeline_stats

router = APIRouter()


@router.get("/stats")
def pipeline_stats():
    return get_pipeline_stats()
