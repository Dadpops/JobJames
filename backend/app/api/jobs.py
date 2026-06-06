import json

from fastapi import APIRouter, HTTPException

from app.crawlers import run_crawlers
from app.database import get_dismissed_jobs, get_job, get_saved_jobs, set_status, upsert_jobs
from app.models.job import JobListing, StatusUpdate
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
    }


def _from_row(row: dict) -> JobListing:
    row = dict(row)
    row["remote"] = bool(row["remote"])
    row["sources"] = json.loads(row.get("sources") or "[]") or [row["source"]]
    row["score_breakdown"] = json.loads(row.get("score_breakdown") or "{}")
    return JobListing(**row)


@router.post("/search", response_model=list[JobListing])
async def search_jobs(req: SearchRequest) -> list[JobListing]:
    raw = await run_crawlers(req)
    unique = deduplicate(raw)
    ranked = score_and_rank(unique, req)
    await upsert_jobs([_to_row(j) for j in ranked])
    return ranked


@router.get("/saved", response_model=list[JobListing])
async def saved_jobs() -> list[JobListing]:
    rows = await get_saved_jobs()
    return [_from_row(r) for r in rows]


@router.get("/dismissed", response_model=list[JobListing])
async def dismissed_jobs() -> list[JobListing]:
    rows = await get_dismissed_jobs()
    return [_from_row(r) for r in rows]


@router.get("/{job_id}", response_model=JobListing)
async def get_job_by_id(job_id: str) -> JobListing:
    row = await get_job(job_id)
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")
    return _from_row(row)


@router.patch("/{job_id}/status", response_model=JobListing)
async def update_status(job_id: str, body: StatusUpdate) -> JobListing:
    row = await set_status(job_id, body.status.value)
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")
    return _from_row(row)
