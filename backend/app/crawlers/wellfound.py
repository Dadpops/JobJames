"""
Wellfound (formerly AngelList Talent) crawler.
Extracts job listings from the Next.js __NEXT_DATA__ JSON blob.
Results may be limited if the site requires authentication.
"""
import hashlib
import json
import re
from urllib.parse import urlencode

import httpx
from bs4 import BeautifulSoup

from app.crawlers.base import BaseCrawler
from app.models.job import JobListing, JobSource
from app.models.search import SearchRequest

_SEARCH_URL = "https://wellfound.com/jobs"
_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,*/*;q=0.9",
    "Accept-Language": "en-US,en;q=0.9",
}


def _find_jobs_in(obj, depth: int = 0) -> list[dict]:
    if depth > 12:
        return []
    if isinstance(obj, list) and obj:
        first = obj[0]
        if isinstance(first, dict) and any(
            k in first for k in ("slug", "title", "role", "jobType", "remoteConfig")
        ):
            return obj
    if isinstance(obj, dict):
        for v in obj.values():
            found = _find_jobs_in(v, depth + 1)
            if found:
                return found
    return []


def _parse_job(raw: dict) -> JobListing | None:
    title = (raw.get("title") or raw.get("role") or "").strip()
    slug = raw.get("slug") or ""
    url = f"https://wellfound.com/jobs/{slug}" if slug else raw.get("url") or ""

    startup = raw.get("startupRole") or {}
    if isinstance(startup, dict):
        org = startup.get("startup") or {}
        company = (org.get("name") if isinstance(org, dict) else "") or ""
    else:
        company = ""

    company = company or (raw.get("company") or raw.get("organization") or {}).get("name", "") or ""
    if isinstance(company, dict):
        company = company.get("name", "")

    loc_config = raw.get("locationConfig") or raw.get("location") or {}
    if isinstance(loc_config, dict):
        location = loc_config.get("city") or loc_config.get("location") or None
    elif isinstance(loc_config, str):
        location = loc_config
    else:
        location = None

    remote_config = raw.get("remoteConfig") or raw.get("remote") or {}
    is_remote = (
        (isinstance(remote_config, dict) and remote_config.get("enabled"))
        or (isinstance(remote_config, bool) and remote_config)
        or "remote" in (location or "").lower()
        or "remote" in title.lower()
    )

    posted_at = raw.get("liveStartAt") or raw.get("createdAt") or raw.get("postedAt")

    sal = raw.get("compensation") or raw.get("salary") or {}
    sal_min = sal_max = None
    if isinstance(sal, dict):
        sal_min = sal.get("min") or sal.get("minValue")
        sal_max = sal.get("max") or sal.get("maxValue")
        if sal_min:
            sal_min = int(float(sal_min))
        if sal_max:
            sal_max = int(float(sal_max))

    if not title or not url:
        return None

    uid = hashlib.md5(url.encode()).hexdigest()
    return JobListing(
        id=uid,
        title=title,
        company=str(company),
        location=location,
        remote=bool(is_remote),
        salary_min=sal_min,
        salary_max=sal_max,
        url=url,
        source=JobSource.wellfound,
        posted_at=str(posted_at) if posted_at else None,
    )


class WellfoundCrawler(BaseCrawler):
    source = "wellfound"

    async def fetch(self, req: SearchRequest) -> list[JobListing]:
        params: dict = {"query": req.title}
        if req.remote:
            params["remote"] = "true"
        if req.location:
            params["location"] = req.location

        url = f"{_SEARCH_URL}?{urlencode(params)}"
        try:
            async with httpx.AsyncClient(
                headers=_HEADERS, follow_redirects=True, timeout=25
            ) as client:
                resp = await client.get(url)
                if resp.status_code != 200:
                    print(f"[wellfound] HTTP {resp.status_code}")
                    return []

                html = resp.text
                m = re.search(
                    r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>',
                    html,
                    re.DOTALL,
                )
                if not m:
                    print("[wellfound] no __NEXT_DATA__ found")
                    return []

                try:
                    data = json.loads(m.group(1))
                except json.JSONDecodeError as exc:
                    print(f"[wellfound] JSON parse error: {exc}")
                    return []

                raw_list = _find_jobs_in(data)
                jobs = []
                for raw in raw_list:
                    job = _parse_job(raw)
                    if job:
                        jobs.append(job)

                if not jobs:
                    print("[wellfound] no jobs parsed — site structure may have changed")

                return jobs
        except Exception as exc:
            print(f"[wellfound] error: {exc}")
            return []
