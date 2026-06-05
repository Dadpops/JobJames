import hashlib

import httpx

from app.crawlers.base import BaseCrawler
from app.models.job import JobListing, JobSource
from app.models.search import SearchRequest

# Greenhouse exposes a public JSON board API at:
# https://boards-api.greenhouse.io/v1/boards/{company_token}/jobs?content=true
GREENHOUSE_COMPANIES: list[str] = []  # populate with known company tokens


class GreenhouseCrawler(BaseCrawler):
    source = "greenhouse"

    async def fetch(self, req: SearchRequest) -> list[JobListing]:
        jobs: list[JobListing] = []
        async with httpx.AsyncClient(timeout=15) as client:
            for token in GREENHOUSE_COMPANIES:
                try:
                    resp = await client.get(
                        f"https://boards-api.greenhouse.io/v1/boards/{token}/jobs",
                        params={"content": "true"},
                    )
                    resp.raise_for_status()
                    for item in resp.json().get("jobs", []):
                        title: str = item.get("title", "")
                        if req.title.lower() not in title.lower():
                            continue
                        uid = hashlib.md5(str(item["id"]).encode()).hexdigest()
                        jobs.append(
                            JobListing(
                                id=uid,
                                title=title,
                                company=token,
                                location=item.get("location", {}).get("name"),
                                url=item.get("absolute_url", ""),
                                source=JobSource.greenhouse,
                                description_snippet=item.get("content", "")[:200],
                            )
                        )
                except Exception as exc:
                    print(f"[greenhouse:{token}] {exc}")
        return jobs
