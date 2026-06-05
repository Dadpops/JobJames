import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException

from app.database import (
    create_saved_search,
    delete_saved_search,
    get_saved_searches,
    get_saved_search,
    update_saved_search,
)
from app.models.saved_search import SavedSearch, SavedSearchCreate, SavedSearchUpdate

router = APIRouter()


@router.get("", response_model=list[SavedSearch])
async def list_searches():
    rows = await get_saved_searches()
    return [_parse(r) for r in rows]


@router.post("", response_model=SavedSearch, status_code=201)
async def create_search(body: SavedSearchCreate):
    from app.services import scheduler as sched
    row = {
        "id": str(uuid.uuid4()),
        "name": body.name,
        "criteria_json": body.criteria_json,
        "schedule": body.schedule,
        "is_enabled": 1,
        "created_at": datetime.now().isoformat(),
    }
    created = await create_saved_search(row)
    sched.reschedule_search(created)
    return _parse(created)


@router.patch("/{search_id}", response_model=SavedSearch)
async def update_search(search_id: str, body: SavedSearchUpdate):
    from app.services import scheduler as sched
    fields = body.model_dump(exclude_none=True)
    if "is_enabled" in fields:
        fields["is_enabled"] = int(fields["is_enabled"])
    row = await update_saved_search(search_id, fields)
    if not row:
        raise HTTPException(status_code=404, detail="Saved search not found")
    sched.reschedule_search(row)
    return _parse(row)


@router.delete("/{search_id}", status_code=204)
async def delete_search(search_id: str):
    from app.services import scheduler as sched
    if not await delete_saved_search(search_id):
        raise HTTPException(status_code=404, detail="Saved search not found")
    job_id = f"search_{search_id}"
    if sched.scheduler.get_job(job_id):
        sched.scheduler.remove_job(job_id)


@router.post("/{search_id}/run", status_code=200)
async def run_search_now(search_id: str):
    from app.services.scheduler import run_saved_search
    row = await get_saved_search(search_id)
    if not row:
        raise HTTPException(status_code=404, detail="Saved search not found")
    count = await run_saved_search(search_id)
    return {"results": count}


def _parse(row: dict) -> SavedSearch:
    return SavedSearch(**{**row, "is_enabled": bool(row["is_enabled"])})
