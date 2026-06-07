from fastapi import APIRouter

from app.api.auth import router as auth_router
from app.api.email_route import router as email_router
from app.api.jobs import router as jobs_router
from app.api.saved_searches import router as searches_router
from app.api.settings import router as settings_router
from app.api.tracker import router as tracker_router

router = APIRouter()
router.include_router(auth_router, prefix="/auth", tags=["auth"])
router.include_router(jobs_router, prefix="/jobs", tags=["jobs"])
router.include_router(email_router, prefix="/jobs", tags=["jobs"])
router.include_router(tracker_router, prefix="/tracker", tags=["tracker"])
router.include_router(settings_router, prefix="/settings", tags=["settings"])
router.include_router(searches_router, prefix="/searches", tags=["searches"])
