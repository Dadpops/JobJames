import asyncio
import hashlib
import json
import re
from datetime import datetime, timezone
from urllib.parse import urlencode

from bs4 import BeautifulSoup
from curl_cffi.requests import AsyncSession

from app.crawlers.base import BaseCrawler
from app.models.job import JobListing, JobSource
from app.models.search import SearchRequest

_REMOTE_GUID = "032b3046-06a3-4876-8dfd-474eb5e7ed11"
_RESULTS_PER_PAGE = 10
_MAX_PAGES = 3

# Impersonate Chrome so Cloudflare lets us through
_IMPERSONATE = "chrome124"


def _extract_mosaic_json(html: str) -> dict | None:
    """Pull the mosaic-provider-jobcards JSON blob out of the page source."""
    marker = 'window.mosaic.providerData["mosaic-provider-jobcards"]='
    idx = html.find(marker)
    if idx == -1:
        return None
    start = idx + len(marker)
    # Walk forward tracking brace depth to find the end of the JSON object
    depth = 0
    for i, ch in enumerate(html[start:], start):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(html[start : i + 1])
                except json.JSONDecodeError:
                    return None
    return None


def _to_yearly(value: float, salary_type: str) -> int:
    """Normalise hourly rates to annual equivalents."""
    if salary_type == "HOURLY":
        return round(value * 2080)  # 40 hrs × 52 weeks
    return round(value)


def _parse_job(item: dict, remote_search: bool = False) -> JobListing:
    jobkey = item.get("jobkey", "")
    url = f"https://www.indeed.com/viewjob?jk={jobkey}"

    # Salary — convert hourly to yearly for consistency with the scoring model
    sal = item.get("extractedSalary") or {}
    sal_type = sal.get("type", "YEARLY")
    sal_min = _to_yearly(sal["min"], sal_type) if "min" in sal else None
    sal_max = _to_yearly(sal["max"], sal_type) if "max" in sal else None

    # Remote — trust the search filter if used; also check per-item signals
    job_types = [
        a.get("label", "").lower()
        for group in item.get("taxonomyAttributes", [])
        for a in group.get("attributes", [])
    ]
    is_remote = (
        remote_search
        or item.get("remoteLocation") is True
        or "remote" in item.get("formattedLocation", "").lower()
        or "remote" in " ".join(job_types)
    )

    snippet = BeautifulSoup(item.get("snippet", ""), "html.parser").get_text(
        " ", strip=True
    )

    # pubDate is a Unix ms timestamp
    pub_ts = item.get("pubDate")
    posted_at = (
        datetime.fromtimestamp(pub_ts / 1000, tz=timezone.utc).strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        )
        if pub_ts
        else None
    )

    uid = hashlib.md5(jobkey.encode()).hexdigest()
    return JobListing(
        id=uid,
        title=item.get("title", ""),
        company=item.get("company", ""),
        location=item.get("formattedLocation"),
        remote=is_remote,
        salary_min=sal_min,
        salary_max=sal_max,
        url=url,
        source=JobSource.indeed,
        description_snippet=snippet[:200],
        posted_at=posted_at,
    )


class IndeedCrawler(BaseCrawler):
    source = "indeed"

    async def fetch(self, req: SearchRequest) -> list[JobListing]:
        jobs: list[JobListing] = []
        async with AsyncSession(impersonate=_IMPERSONATE) as session:
            for page in range(_MAX_PAGES):
                params: dict = {
                    "q": req.title,
                    "sort": "date",
                    "start": page * _RESULTS_PER_PAGE,
                }
                if req.location:
                    params["l"] = req.location
                if req.remote:
                    params["remotejob"] = _REMOTE_GUID
                # Date posted: fromage = days ago
                _date_map = {"day": 1, "week": 7, "month": 30}
                if req.date_posted.value in _date_map:
                    params["fromage"] = _date_map[req.date_posted.value]
                # Job type
                _jt_map = {"fulltime": "fulltime", "parttime": "parttime",
                           "contract": "contract", "internship": "internship"}
                if req.job_type.value in _jt_map:
                    params["jt"] = _jt_map[req.job_type.value]

                url = f"https://www.indeed.com/jobs?{urlencode(params)}"
                try:
                    resp = await session.get(url, timeout=20)
                    if resp.status_code != 200:
                        print(f"[indeed] HTTP {resp.status_code} on page {page}")
                        break

                    mosaic = _extract_mosaic_json(resp.text)
                    if not mosaic:
                        break  # subsequent pages sometimes omit the blob; stop quietly

                    results = (
                        mosaic.get("metaData", {})
                        .get("mosaicProviderJobCardsModel", {})
                        .get("results", [])
                    )
                    if not results:
                        break

                    for item in results:
                        try:
                            jobs.append(_parse_job(item, remote_search=req.remote))
                        except Exception as exc:
                            print(f"[indeed] parse error for job {item.get('jobkey')}: {exc}")

                    if page < _MAX_PAGES - 1:
                        await asyncio.sleep(1.5)

                except Exception as exc:
                    print(f"[indeed] page {page} error: {exc}")
                    break

        return jobs
