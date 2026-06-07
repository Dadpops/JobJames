import json

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import require_access_code
from app.crawlers import run_crawlers
from app.database import get_dismissed_jobs, get_job, get_saved_jobs, log_activity, set_status, upsert_jobs
from app.models.job import JobListing, JobListingPublic, StatusUpdate
from app.models.search import SearchRequest
from app.services.deduplication import deduplicate
from app.services.scoring import score_and_rank

router = APIRouter()


def _to_row(job: JobListing) -> dict:
    sources = job.sources if job.sources else [job.source.value]
    return {
        "id": job.id,
        "title": job.title,
        "company": job.company,
        "location": job.location,
        "remote": int(job.remote),
        "salary_min": job.salary_min,
        "salary_max": job.salary_max,
        "url": job.url,
        "source": job.source.value,
        "description_snippet": job.description_snippet,
        "posted_at": job.posted_at,
        "score": job.score,
        "status": job.status.value,
        "sources": json.dumps(sources),
        "score_breakdown": json.dumps(job.score_breakdown),
        "glassdoor_rating": job.glassdoor_rating,
    }


def _from_row(row: dict) -> JobListing:
    row = dict(row)
    row["remote"] = bool(row["remote"])
    row["sources"] = json.loads(row.get("sources") or "[]") or [row["source"]]
    row["score_breakdown"] = json.loads(row.get("score_breakdown") or "{}")
    row.setdefault("glassdoor_rating", None)
    return JobListing(**row)


@router.post("/search", response_model=list[JobListingPublic])
async def search_jobs(
    req: SearchRequest,
    access_code: str = Depends(require_access_code),
) -> list[JobListingPublic]:
    raw = await run_crawlers(req)
    unique = deduplicate(raw)
    ranked = score_and_rank(unique, req)
    await upsert_jobs([_to_row(j) for j in ranked], access_code)
    loc = f" in {req.location}" if req.location else ""
    await log_activity(access_code, "search", f"Searched: {req.title}{loc} ({len(ranked)} results)")
    return ranked


@router.get("/saved", response_model=list[JobListingPublic])
async def saved_jobs(access_code: str = Depends(require_access_code)) -> list[JobListingPublic]:
    rows = await get_saved_jobs(access_code)
    return [_from_row(r) for r in rows]


@router.get("/dismissed", response_model=list[JobListingPublic])
async def dismissed_jobs(access_code: str = Depends(require_access_code)) -> list[JobListingPublic]:
    rows = await get_dismissed_jobs(access_code)
    return [_from_row(r) for r in rows]


@router.get("/{job_id}", response_model=JobListingPublic)
async def get_job_by_id(
    job_id: str,
    access_code: str = Depends(require_access_code),
) -> JobListingPublic:
    row = await get_job(job_id, access_code)
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")
    return _from_row(row)


@router.patch("/{job_id}/status", response_model=JobListingPublic)
async def update_status(
    job_id: str,
    body: StatusUpdate,
    access_code: str = Depends(require_access_code),
) -> JobListingPublic:
    row = await set_status(job_id, body.status.value, access_code)
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")
    job = _from_row(row)
    label = f"{job.title} at {job.company}"
    if body.status.value == "saved":
        await log_activity(access_code, "job_saved", f"Saved: {label}", entity_id=job_id)
    elif body.status.value == "dismissed":
        await log_activity(access_code, "job_dismissed", f"Dismissed: {label}", entity_id=job_id)
    return job
