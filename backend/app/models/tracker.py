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
    dismissed = "Dismissed"


class TrackerEntry(BaseModel):
    id: str
    title: str
    company: str
    location: Optional[str] = None
    url: Optional[str] = None
    status: TrackerStatus = TrackerStatus.found
    date_added: str
    followup_date: Optional[str] = None
    deadline: Optional[str] = None
    notes: Optional[str] = None
    tags: list[str] = []
    sort_order: Optional[int] = None
    recruiter_name: Optional[str] = None
    recruiter_email: Optional[str] = None
    recruiter_linkedin: Optional[str] = None
    last_contact_date: Optional[str] = None
    target_salary: Optional[int] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    company_size: Optional[str] = None
    company_industry: Optional[str] = None
    company_notes: Optional[str] = None


class TrackerCreate(BaseModel):
    title: str
    company: str
    location: Optional[str] = None
    url: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    status: Optional[str] = "Found"


class TrackerUpdate(BaseModel):
    status: Optional[TrackerStatus] = None
    followup_date: Optional[str] = None
    deadline: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[list[str]] = None
    sort_order: Optional[int] = None
    recruiter_name: Optional[str] = None
    recruiter_email: Optional[str] = None
    recruiter_linkedin: Optional[str] = None
    last_contact_date: Optional[str] = None
    target_salary: Optional[int] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    company_size: Optional[str] = None
    company_industry: Optional[str] = None
    company_notes: Optional[str] = None
