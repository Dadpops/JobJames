from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel


class TrackerStatus(str, Enum):
    found = "Found"
    reviewing = "Reviewing"
    applied = "Applied"
    interviewing = "Interviewing"
    offer = "Offer"
    rejected = "Rejected"


class TrackerEntry(BaseModel):
    id: str
    title: str
    company: str
    location: Optional[str] = None
    url: Optional[str] = None
    status: TrackerStatus = TrackerStatus.found
    date_added: str
    followup_date: Optional[str] = None
    notes: Optional[str] = None


class TrackerCreate(BaseModel):
    title: str
    company: str
    location: Optional[str] = None
    url: Optional[str] = None


class TrackerUpdate(BaseModel):
    status: Optional[TrackerStatus] = None
    followup_date: Optional[str] = None
    notes: Optional[str] = None
