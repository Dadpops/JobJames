from fastapi import APIRouter

from app.api.email_route import router as email_router
from app.api.jobs import router as jobs_router

router = APIRouter()
router.include_router(jobs_router, prefix="/jobs", tags=["jobs"])
router.include_router(email_router, prefix="/jobs", tags=["jobs"])
