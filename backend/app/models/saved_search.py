from __future__ import annotations
from typing import Optional
from pydantic import BaseModel


class SavedSearch(BaseModel):
    id: str
    name: str
    criteria_json: str       # JSON-encoded SearchRequest fields
    schedule: str = "off"    # daily | twice_daily | off
    is_enabled: bool = True
    last_run: Optional[str] = None
    created_at: str


class SavedSearchCreate(BaseModel):
    name: str
    criteria_json: str
    schedule: str = "off"


class SavedSearchUpdate(BaseModel):
    name: Optional[str] = None
    schedule: Optional[str] = None
    is_enabled: Optional[bool] = None
