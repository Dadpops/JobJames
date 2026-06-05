from fastapi import APIRouter, HTTPException

from app.crawlers import run_crawlers
from app.models.job import JobListing, StatusUpdate
from app.models.search import SearchRequest
from app.services.deduplication import deduplicate
from app.services.scoring import score_and_rank

router = APIRouter()

# In-memory store for Phase 1 (no DB yet)
_jobs: dict[str, JobListing] = {}


@router.post("/search", response_model=list[JobListing])
async def search_jobs(req: SearchRequest) -> list[JobListing]:
    raw = await run_crawlers(req)
    unique = deduplicate(raw)
    ranked = score_and_rank(unique, req)
    _jobs.update({job.id: job for job in ranked})
    return ranked


@router.get("/{job_id}", response_model=JobListing)
def get_job(job_id: str) -> JobListing:
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.patch("/{job_id}/status", response_model=JobListing)
def update_status(job_id: str, body: StatusUpdate) -> JobListing:
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    updated = job.model_copy(update={"status": body.status})
    _jobs[job_id] = updated
    return updated
