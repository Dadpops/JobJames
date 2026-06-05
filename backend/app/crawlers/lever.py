import hashlib

import httpx

from app.crawlers.base import BaseCrawler
from app.models.job import JobListing, JobSource
from app.models.search import SearchRequest

# Lever exposes a public API at:
# https://api.lever.co/v0/postings/{company}?mode=json
LEVER_COMPANIES: list[str] = []  # populate with known company slugs


class LeverCrawler(BaseCrawler):
    source = "lever"

    async def fetch(self, req: SearchRequest) -> list[JobListing]:
        jobs: list[JobListing] = []
        async with httpx.AsyncClient(timeout=15) as client:
            for company in LEVER_COMPANIES:
                try:
                    resp = await client.get(
                        f"https://api.lever.co/v0/postings/{company}",
                        params={"mode": "json"},
                    )
                    resp.raise_for_status()
                    for item in resp.json():
                        title: str = item.get("text", "")
                        if req.title.lower() not in title.lower():
                            continue
                        uid = hashlib.md5(item["id"].encode()).hexdigest()
                        location = item.get("categories", {}).get("location")
                        jobs.append(
                            JobListing(
                                id=uid,
                                title=title,
                                company=company,
                                location=location,
                                url=item.get("hostedUrl", ""),
                                source=JobSource.lever,
                                description_snippet=item.get("descriptionPlain", "")[:200],
                            )
                        )
                except Exception as exc:
                    print(f"[lever:{company}] {exc}")
        return jobs
