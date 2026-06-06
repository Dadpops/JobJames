from __future__ import annotations
from typing import Optional
from pydantic import BaseModel


class SavedSearch(BaseModel):
    id: str
    name: str
    criteria_json: str
    schedule: str = "off"
    is_enabled: bool = True
    last_run: Optional[str] = None
    created_at: str
    recipient_email: Optional[str] = None
    result_limit: int = 10


class SavedSearchCreate(BaseModel):
    name: str
    criteria_json: str
    schedule: str = "off"
    recipient_email: Optional[str] = None
    result_limit: int = 10


class SavedSearchUpdate(BaseModel):
    name: Optional[str] = None
    criteria_json: Optional[str] = None
    schedule: Optional[str] = None
    is_enabled: Optional[bool] = None
    recipient_email: Optional[str] = None
    result_limit: Optional[int] = None
