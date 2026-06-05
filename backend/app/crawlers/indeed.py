import hashlib

import httpx
from bs4 import BeautifulSoup

from app.crawlers.base import BaseCrawler
from app.models.job import JobListing, JobSource
from app.models.search import SearchRequest


class IndeedCrawler(BaseCrawler):
    source = "indeed"

    async def fetch(self, req: SearchRequest) -> list[JobListing]:
        # TODO: Implement Indeed scraping (requires rotating proxies / Indeed API)
        # Placeholder returns empty list until implemented
        return []
