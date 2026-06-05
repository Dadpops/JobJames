import csv
import io
import uuid
from datetime import date

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.database import (
    bulk_reorder_tracker,
    create_tracker_entry,
    delete_tracker_entry,
    get_tracker_entries,
    get_tracker_entry,
    update_tracker_entry,
)
from app.models.tracker import TrackerCreate, TrackerEntry, TrackerUpdate

router = APIRouter()

_EMPTY_ENTRY = dict(
    deadline=None, tags=[], recruiter_name=None, recruiter_email=None,
    recruiter_linkedin=None, last_contact_date=None, target_salary=None,
    salary_min=None, salary_max=None, company_size=None,
    company_industry=None, company_notes=None,
)


class _ReorderItem(BaseModel):
    id: str
    sort_order: int


@router.patch("/reorder", status_code=200)
async def reorder_tracker(body: list[_ReorderItem]):
    await bulk_reorder_tracker([i.model_dump() for i in body])
    return {}


@router.get("", response_model=list[TrackerEntry])
async def list_tracker():
    return await get_tracker_entries()


@router.post("", response_model=TrackerEntry, status_code=201)
async def add_to_tracker(body: TrackerCreate):
    entry = {
        **_EMPTY_ENTRY,
        "id": str(uuid.uuid4()),
        "title": body.title,
        "company": body.company,
        "location": body.location,
        "url": str(body.url) if body.url else None,
        "status": "Found",
        "date_added": date.today().isoformat(),
        "followup_date": None,
        "notes": None,
        "salary_min": body.salary_min,
        "salary_max": body.salary_max,
    }
    return await create_tracker_entry(entry)


@router.patch("/{entry_id}", response_model=TrackerEntry)
async def patch_tracker_entry(entry_id: str, body: TrackerUpdate):
    fields = body.model_dump(exclude_none=True)
    if "status" in fields and hasattr(fields["status"], "value"):
        fields["status"] = fields["status"].value
    row = await update_tracker_entry(entry_id, fields)
    if not row:
        raise HTTPException(status_code=404, detail="Tracker entry not found")
    return row


@router.delete("/{entry_id}", status_code=204)
async def remove_tracker_entry(entry_id: str):
    if not await delete_tracker_entry(entry_id):
        raise HTTPException(status_code=404, detail="Tracker entry not found")


@router.post("/from-job/{job_id}", response_model=TrackerEntry, status_code=201)
async def add_from_job(job_id: str):
    from app.database import get_job
    job = await get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    entry = {
        **_EMPTY_ENTRY,
        "id": str(uuid.uuid4()),
        "title": job["title"],
        "company": job["company"],
        "location": job.get("location"),
        "url": job.get("url"),
        "status": "Found",
        "date_added": date.today().isoformat(),
        "followup_date": None,
        "notes": None,
        "salary_min": job.get("salary_min"),
        "salary_max": job.get("salary_max"),
    }
    return await create_tracker_entry(entry)


@router.get("/export/csv")
async def export_csv():
    entries = await get_tracker_entries()
    output = io.StringIO()
    fields = [
        "title", "company", "location", "url", "status", "date_added",
        "deadline", "followup_date", "notes", "tags",
        "recruiter_name", "recruiter_email", "recruiter_linkedin", "last_contact_date",
        "target_salary", "salary_min", "salary_max",
        "company_size", "company_industry", "company_notes",
    ]
    writer = csv.DictWriter(output, fieldnames=fields, extrasaction="ignore")
    writer.writeheader()
    for e in entries:
        row = dict(e)
        row["tags"] = ", ".join(row.get("tags") or [])
        writer.writerow(row)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=tracker.csv"},
    )
