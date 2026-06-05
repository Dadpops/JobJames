from app.crawlers.base import BaseCrawler
from app.models.job import JobListing
from app.models.search import SearchRequest


class LinkedInCrawler(BaseCrawler):
    source = "linkedin"

    async def fetch(self, req: SearchRequest) -> list[JobListing]:
        # LinkedIn scraping requires authentication and is rate-limited aggressively.
        # TODO: integrate via LinkedIn Jobs API or a compliant third-party provider.
        return []
