from typing import Optional

from pydantic import BaseModel


class SearchRequest(BaseModel):
    title: str
    location: Optional[str] = None
    remote: bool = False
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    sources: list[str] = ["indeed", "greenhouse", "lever", "linkedin"]
