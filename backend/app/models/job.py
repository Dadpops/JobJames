from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel


class JobStatus(str, Enum):
    new = "new"
    saved = "saved"
    dismissed = "dismissed"


class JobSource(str, Enum):
    indeed = "indeed"
    greenhouse = "greenhouse"
    lever = "lever"
    linkedin = "linkedin"


class JobListing(BaseModel):
    id: str
    title: str
    company: str
    location: Optional[str] = None
    remote: bool = False
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    url: str
    source: JobSource
    description_snippet: Optional[str] = None
    posted_at: Optional[str] = None
    score: float = 0.0
    status: JobStatus = JobStatus.new
    sources: list[str] = []
    score_breakdown: dict = {}


class StatusUpdate(BaseModel):
    status: JobStatus
