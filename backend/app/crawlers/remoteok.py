"""
Remote OK crawler — uses the public JSON API at https://remoteok.io/api
Returns remote-only jobs; filters by title keyword locally.
API docs: https://remoteok.io/api (no auth required)
"""
import hashlib
import re
from urllib.parse import quote_plus

import httpx

from app.crawlers.base import BaseCrawler
from app.models.job import JobListing, JobSource
from app.models.search import SearchRequest

_API_URL = "https://remoteok.io/api"
_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; JobJames/1.0)",
    "Accept": "application/json",
}
_MAX_RESULTS = 40


def _matches(job: dict, req: SearchRequest) -> bool:
    """Filter remotely since the API doesn't support all search params."""
    query_words = set(req.title.lower().split())
    title = (job.get("position") or "").lower()
    tags = [t.lower() for t in (job.get("tags") or [])]
    combined = title + " " + " ".join(tags)
    return any(w in combined for w in query_words)


def _parse_salary(job: dict) -> tuple[int | None, int | None]:
    sal = job.get("salary_min") or job.get("salary")
    sal_max = job.get("salary_max")
    try:
        return (int(sal) if sal else None, int(sal_max) if sal_max else None)
    except (ValueError, TypeError):
        return None, None


class RemoteOKCrawler(BaseCrawler):
    source = "remoteok"

    async def fetch(self, req: SearchRequest) -> list[JobListing]:
        # Build tag-filtered URL if possible
        slug = quote_plus(re.sub(r"\s+", "-", req.title.lower().strip()))
        url = f"{_API_URL}?tags={slug}"

        try:
            async with httpx.AsyncClient(
                headers=_HEADERS, follow_redirects=True, timeout=20
            ) as client:
                resp = await client.get(url)
                if resp.status_code != 200:
                    # Fall back to full API
                    resp = await client.get(_API_URL)
                if resp.status_code != 200:
                    print(f"[remoteok] HTTP {resp.status_code}")
                    return []

                data = resp.json()
                # First item is a metadata object, skip it
                if data and not data[0].get("id"):
                    data = data[1:]

                jobs = []
                for item in data:
                    if not _matches(item, req):
                        continue

                    title = (item.get("position") or "").strip()
                    company = (item.get("company") or "").strip()
                    url_link = item.get("url") or f"https://remoteok.io/l/{item.get('id', '')}"
                    posted_at = item.get("date")
                    desc = re.sub(r"<[^>]+>", "", item.get("description") or "")[:280] or None
                    sal_min, sal_max = _parse_salary(item)

                    location_str = item.get("location") or "Remote"
                    if not title or not company:
                        continue

                    sal_min_f = sal_min if sal_min and sal_min > 1000 else None
                    sal_max_f = sal_max if sal_max and sal_max > 1000 else None

                    uid = hashlib.md5(url_link.encode()).hexdigest()
                    jobs.append(JobListing(
                        id=uid,
                        title=title,
                        company=company,
                        location=location_str,
                        remote=True,
                        salary_min=sal_min_f,
                        salary_max=sal_max_f,
                        url=url_link,
                        source=JobSource.remoteok,
                        description_snippet=desc,
                        posted_at=posted_at,
                    ))
                    if len(jobs) >= _MAX_RESULTS:
                        break

                return jobs
        except Exception as exc:
            print(f"[remoteok] error: {exc}")
            return []
