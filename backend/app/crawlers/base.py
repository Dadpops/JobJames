from abc import ABC, abstractmethod

from app.models.job import JobListing
from app.models.search import SearchRequest


class BaseCrawler(ABC):
    source: str = ""

    @abstractmethod
    async def fetch(self, req: SearchRequest) -> list[JobListing]:
        """Fetch job listings matching the search request."""
        ...
