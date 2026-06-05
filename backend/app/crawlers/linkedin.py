import asyncio
import hashlib
import re
from urllib.parse import urlencode

from bs4 import BeautifulSoup
from curl_cffi.requests import AsyncSession

from app.crawlers.base import BaseCrawler
from app.models.job import JobListing, JobSource
from app.models.search import SearchRequest

_GUEST_API = (
    "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"
)
_RESULTS_PER_PAGE = 10
_MAX_PAGES = 3
_IMPERSONATE = "chrome124"


def _job_id(urn: str) -> str:
    """Extract numeric job ID from 'urn:li:jobPosting:1234567890'."""
    m = re.search(r":(\d+)$", urn)
    return m.group(1) if m else urn


def _parse_salary(text: str) -> tuple[int | None, int | None]:
    """Parse '$80K–$120K/yr' or '$80,000 - $120,000' style strings."""
    text = text.replace(",", "").replace(" ", "")
    m = re.search(r"\$([\d.]+)([Kk]?)[–\-]+\$([\d.]+)([Kk]?)", text)
    if m:
        lo = float(m.group(1)) * (1000 if m.group(2).lower() == "k" else 1)
        hi = float(m.group(3)) * (1000 if m.group(4).lower() == "k" else 1)
        return round(lo), round(hi)
    return None, None


def _parse_card(card, remote_search: bool) -> JobListing | None:
    urn = card.get("data-entity-urn", "")
    job_id = _job_id(urn)
    if not job_id:
        return None

    title_el = card.find(class_="base-search-card__title")
    company_el = card.find(class_="base-search-card__subtitle")
    loc_el = card.find(class_="job-search-card__location")
    link_el = card.find("a", class_="base-card__full-link")
    date_el = card.find("time")
    salary_el = card.find(class_="job-search-card__salary-info")

    title = title_el.get_text(strip=True) if title_el else ""
    company = company_el.get_text(strip=True) if company_el else ""
    location = loc_el.get_text(strip=True) if loc_el else None
    url = link_el["href"].split("?")[0] if link_el else f"https://www.linkedin.com/jobs/view/{job_id}"
    posted_at = date_el.get("datetime") if date_el else None

    sal_min, sal_max = _parse_salary(salary_el.get_text(strip=True)) if salary_el else (None, None)

    is_remote = (
        remote_search
        or "remote" in (location or "").lower()
        or "remote" in title.lower()
    )

    uid = hashlib.md5(job_id.encode()).hexdigest()
    return JobListing(
        id=uid,
        title=title,
        company=company,
        location=location,
        remote=is_remote,
        salary_min=sal_min,
        salary_max=sal_max,
        url=url,
        source=JobSource.linkedin,
        posted_at=posted_at,
    )


class LinkedInCrawler(BaseCrawler):
    source = "linkedin"

    async def fetch(self, req: SearchRequest) -> list[JobListing]:
        jobs: list[JobListing] = []
        async with AsyncSession(impersonate=_IMPERSONATE) as session:
            for page in range(_MAX_PAGES):
                params: dict = {
                    "keywords": req.title,
                    "start": page * _RESULTS_PER_PAGE,
                }
                if req.location:
                    params["location"] = req.location
                if req.remote:
                    params["f_WT"] = 2  # LinkedIn's "remote" work-type filter

                try:
                    resp = await session.get(
                        f"{_GUEST_API}?{urlencode(params)}", timeout=20
                    )
                    if resp.status_code != 200:
                        print(f"[linkedin] HTTP {resp.status_code} on page {page}")
                        break

                    soup = BeautifulSoup(resp.text, "html.parser")
                    cards = soup.find_all("div", class_="base-search-card")
                    if not cards:
                        break

                    for card in cards:
                        try:
                            job = _parse_card(card, remote_search=req.remote)
                            if job:
                                jobs.append(job)
                        except Exception as exc:
                            urn = card.get("data-entity-urn", "?")
                            print(f"[linkedin] parse error {urn}: {exc}")

                    if page < _MAX_PAGES - 1:
                        await asyncio.sleep(1.5)

                except Exception as exc:
                    print(f"[linkedin] page {page} error: {exc}")
                    break

        return jobs
