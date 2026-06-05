from enum import Enum
from typing import Optional

from pydantic import BaseModel


class DatePosted(str, Enum):
    any = "any"
    day = "day"
    week = "week"
    month = "month"


class ExperienceLevel(str, Enum):
    any = "any"
    entry = "entry"
    mid = "mid"
    senior = "senior"


class JobType(str, Enum):
    any = "any"
    fulltime = "fulltime"
    parttime = "parttime"
    contract = "contract"
    internship = "internship"


class SearchRequest(BaseModel):
    title: str
    location: Optional[str] = None
    remote: bool = False
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    sources: list[str] = ["indeed", "greenhouse", "lever", "linkedin"]
    date_posted: DatePosted = DatePosted.any
    experience_level: ExperienceLevel = ExperienceLevel.any
    job_type: JobType = JobType.any
