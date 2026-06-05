from fastapi import APIRouter

from app.api.email_route import router as email_router
from app.api.jobs import router as jobs_router
from app.api.tracker import router as tracker_router

router = APIRouter()
router.include_router(jobs_router, prefix="/jobs", tags=["jobs"])
router.include_router(email_router, prefix="/jobs", tags=["jobs"])
router.include_router(tracker_router, prefix="/tracker", tags=["tracker"])
