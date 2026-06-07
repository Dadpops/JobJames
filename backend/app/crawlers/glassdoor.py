"""
Glassdoor crawler — uses curl_cffi to bypass bot detection.
Extracts job listings from embedded __NEXT_DATA__ JSON.
Note: Glassdoor requires authentication for most searches; results may
be limited or empty depending on their anti-bot rules.
"""
import hashlib
import json
import re
from urllib.parse import urlencode

from curl_cffi.requests import AsyncSession

from app.crawlers.base import BaseCrawler
from app.models.job import JobListing, JobSource
from app.models.search import SearchRequest

_SEARCH_URL = "https://www.glassdoor.com/Job/jobs.htm"
_IMPERSONATE = "chrome124"
_DATE_MAP = {"day": "1", "week": "7", "month": "30"}


def _extract_next_data(html: str) -> list[dict]:
    """Extract job listings from Next.js __NEXT_DATA__ JSON blob."""
    m = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html, re.DOTALL)
    if not m:
        return []
    try:
        data = json.loads(m.group(1))
    except json.JSONDecodeError:
        return []

    # Walk the page props to find job listing arrays
    def find_jobs(obj, depth=0):
        if depth > 10:
            return []
        if isinstance(obj, list) and obj and isinstance(obj[0], dict):
            if any(k in obj[0] for k in ("jobTitleText", "jobTitle", "title", "listingId")):
                return obj
        if isinstance(obj, dict):
            for v in obj.values():
                found = find_jobs(v, depth + 1)
                if found:
                    return found
        return []

    return find_jobs(data)


def _extract_jsonld(html: str) -> list[dict]:
    """Fallback: extract schema.org JobPosting objects from JSON-LD scripts."""
    jobs = []
    for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>', html, re.DOTALL):
        try:
            data = json.loads(m.group(1))
        except json.JSONDecodeError:
            continue
        if isinstance(data, dict) and data.get("@type") == "JobPosting":
            jobs.append(data)
        elif isinstance(data, dict) and data.get("@type") == "ItemList":
            for item in data.get("itemListElement", []):
                if isinstance(item, dict):
                    jobs.append(item.get("item", item))
    return jobs


def _from_next(raw: dict, remote_search: bool) -> JobListing | None:
    title = (raw.get("jobTitleText") or raw.get("jobTitle") or raw.get("title") or "").strip()
    company = (raw.get("employerName") or raw.get("company") or "").strip()
    location = (raw.get("locationName") or raw.get("location") or "").strip() or None
    listing_id = raw.get("listingId") or raw.get("jobListingId") or raw.get("id") or ""
    url = raw.get("jobViewUrl") or raw.get("url") or (
        f"https://www.glassdoor.com/job-listing/jl{listing_id}" if listing_id else ""
    )
    posted_at = raw.get("listingDateTimestamp") or raw.get("postedDate")

    if not title or not url:
        return None

    is_remote = (
        remote_search
        or "remote" in (location or "").lower()
        or "remote" in title.lower()
    )
    uid = hashlib.md5(url.encode()).hexdigest()
    return JobListing(
        id=uid,
        title=title,
        company=company,
        location=location,
        remote=is_remote,
        url=url,
        source=JobSource.glassdoor,
        posted_at=str(posted_at) if posted_at else None,
    )


def _from_jsonld(raw: dict, remote_search: bool) -> JobListing | None:
    title = (raw.get("title") or "").strip()
    org = raw.get("hiringOrganization", {})
    company = org.get("name", "") if isinstance(org, dict) else ""
    url = raw.get("url") or raw.get("@id") or ""
    posted_at = raw.get("datePosted")

    loc_data = raw.get("jobLocation", {})
    if isinstance(loc_data, list):
        loc_data = loc_data[0] if loc_data else {}
    addr = loc_data.get("address", {}) if isinstance(loc_data, dict) else {}
    city = addr.get("addressLocality", "") if isinstance(addr, dict) else ""
    state = addr.get("addressRegion", "") if isinstance(addr, dict) else ""
    location = ", ".join(filter(None, [city, state])) or None

    is_remote = (
        remote_search
        or raw.get("jobLocationType") == "TELECOMMUTE"
        or "remote" in (location or "").lower()
    )
    if not title or not url:
        return None
    uid = hashlib.md5(url.encode()).hexdigest()
    return JobListing(
        id=uid,
        title=title,
        company=company,
        location=location,
        remote=is_remote,
        url=url,
        source=JobSource.glassdoor,
        posted_at=posted_at,
    )


class GlassdoorCrawler(BaseCrawler):
    source = "glassdoor"

    async def fetch(self, req: SearchRequest) -> list[JobListing]:
        params: dict = {
            "sc.keyword": req.title,
            "locT": "N",  # Nationwide
        }
        if req.location:
            params["locT"] = "C"
            params["locKeyword"] = req.location
        if req.remote:
            params["remoteWorkType"] = "1"
        if req.date_posted.value in _DATE_MAP:
            params["fromAge"] = _DATE_MAP[req.date_posted.value]

        url = f"{_SEARCH_URL}?{urlencode(params)}"
        try:
            async with AsyncSession(impersonate=_IMPERSONATE) as session:
                resp = await session.get(url, timeout=25)
                if resp.status_code != 200:
                    print(f"[glassdoor] HTTP {resp.status_code}")
                    return []

                html = resp.text
                jobs: list[JobListing] = []

                # Try __NEXT_DATA__ first
                raw_list = _extract_next_data(html)
                for raw in raw_list:
                    job = _from_next(raw, req.remote)
                    if job:
                        jobs.append(job)

                # Fall back to JSON-LD
                if not jobs:
                    for raw in _extract_jsonld(html):
                        job = _from_jsonld(raw, req.remote)
                        if job:
                            jobs.append(job)

                if not jobs:
                    print("[glassdoor] no jobs extracted — site may require auth")

                return jobs
        except Exception as exc:
            print(f"[glassdoor] error: {exc}")
            return []
