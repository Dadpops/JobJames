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
    glassdoor = "glassdoor"
    wellfound = "wellfound"
    ziprecruiter = "ziprecruiter"
    remoteok = "remoteok"
    weworkremotely = "weworkremotely"


class JobListing(BaseModel):
    """Internal model — includes score/score_breakdown for ranking. Use JobListingPublic for API responses."""
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
    glassdoor_rating: Optional[float] = None


class JobListingPublic(BaseModel):
    """API response model — score and breakdown are excluded (will re-appear in Phase 5 with resume matching)."""
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
    status: JobStatus = JobStatus.new
    sources: list[str] = []
    glassdoor_rating: Optional[float] = None


class StatusUpdate(BaseModel):
    status: JobStatus
