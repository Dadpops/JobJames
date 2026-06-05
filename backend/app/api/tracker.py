import uuid
from datetime import date

from fastapi import APIRouter, HTTPException

from app.database import (
    create_tracker_entry,
    delete_tracker_entry,
    get_tracker_entries,
    get_tracker_entry,
    update_tracker_entry,
)
from app.models.tracker import TrackerCreate, TrackerEntry, TrackerUpdate

router = APIRouter()


@router.get("", response_model=list[TrackerEntry])
async def list_tracker():
    return await get_tracker_entries()


@router.post("", response_model=TrackerEntry, status_code=201)
async def add_to_tracker(body: TrackerCreate):
    entry = {
        "id": str(uuid.uuid4()),
        "title": body.title,
        "company": body.company,
        "location": body.location,
        "url": str(body.url) if body.url else None,
        "status": "Found",
        "date_added": date.today().isoformat(),
        "followup_date": None,
        "notes": None,
    }
    return await create_tracker_entry(entry)


@router.patch("/{entry_id}", response_model=TrackerEntry)
async def patch_tracker_entry(entry_id: str, body: TrackerUpdate):
    fields = body.model_dump(exclude_none=True)
    if "status" in fields:
        fields["status"] = fields["status"].value if hasattr(fields["status"], "value") else fields["status"]
    row = await update_tracker_entry(entry_id, fields)
    if not row:
        raise HTTPException(status_code=404, detail="Tracker entry not found")
    return row


@router.delete("/{entry_id}", status_code=204)
async def remove_tracker_entry(entry_id: str):
    deleted = await delete_tracker_entry(entry_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Tracker entry not found")


@router.post("/from-job/{job_id}", response_model=TrackerEntry, status_code=201)
async def add_from_job(job_id: str):
    from app.database import get_job
    job = await get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    entry = {
        "id": str(uuid.uuid4()),
        "title": job["title"],
        "company": job["company"],
        "location": job.get("location"),
        "url": job.get("url"),
        "status": "Found",
        "date_added": date.today().isoformat(),
        "followup_date": None,
        "notes": None,
    }
    return await create_tracker_entry(entry)
