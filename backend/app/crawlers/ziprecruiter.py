import hashlib
import json
import re
from urllib.parse import urlencode

import httpx
from bs4 import BeautifulSoup

from app.crawlers.base import BaseCrawler
from app.models.job import JobListing, JobSource
from app.models.search import SearchRequest

_SEARCH_URL = "https://www.ziprecruiter.com/jobs-search"
_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.ziprecruiter.com/",
}
_DATE_MAP = {"day": "1", "week": "7", "month": "30"}


def _parse_salary_range(text: str) -> tuple[int | None, int | None]:
    text = text.replace(",", "").replace(" ", "")
    m = re.search(r"\$([\d.]+)([Kk]?)[–\-]+\$([\d.]+)([Kk]?)", text)
    if m:
        lo = float(m.group(1)) * (1000 if m.group(2).lower() == "k" else 1)
        hi = float(m.group(3)) * (1000 if m.group(4).lower() == "k" else 1)
        return round(lo), round(hi)
    m = re.search(r"\$([\d.]+)([Kk]?)", text)
    if m:
        val = float(m.group(1)) * (1000 if m.group(2).lower() == "k" else 1)
        return round(val), None
    return None, None


def _extract_from_jsonld(soup: BeautifulSoup) -> list[JobListing]:
    jobs = []
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
        except (json.JSONDecodeError, TypeError):
            continue

        items = []
        if data.get("@type") == "ItemList":
            items = [e.get("item", e) for e in data.get("itemListElement", [])]
        elif data.get("@type") == "JobPosting":
            items = [data]

        for item in items:
            if item.get("@type") != "JobPosting":
                continue
            title = item.get("title", "")
            org = item.get("hiringOrganization", {})
            company = org.get("name", "") if isinstance(org, dict) else ""
            url = item.get("url", "") or item.get("identifier", {}).get("value", "")
            posted_at = item.get("datePosted")
            desc = item.get("description", "")

            loc_data = item.get("jobLocation", {})
            if isinstance(loc_data, list):
                loc_data = loc_data[0] if loc_data else {}
            addr = loc_data.get("address", {}) if isinstance(loc_data, dict) else {}
            city = addr.get("addressLocality", "") if isinstance(addr, dict) else ""
            state = addr.get("addressRegion", "") if isinstance(addr, dict) else ""
            location = ", ".join(filter(None, [city, state])) or None

            remote = (
                item.get("jobLocationType") == "TELECOMMUTE"
                or "remote" in title.lower()
                or "remote" in (location or "").lower()
            )

            sal = item.get("baseSalary", {})
            sal_min = sal_max = None
            if isinstance(sal, dict):
                val = sal.get("value", {})
                if isinstance(val, dict):
                    sal_min = val.get("minValue")
                    sal_max = val.get("maxValue")
                    if sal_min:
                        sal_min = int(float(sal_min))
                    if sal_max:
                        sal_max = int(float(sal_max))

            snippet = re.sub(r"<[^>]+>", "", desc)[:280] if desc else None

            if not title or not url:
                continue
            uid = hashlib.md5(url.encode()).hexdigest()
            jobs.append(JobListing(
                id=uid,
                title=title,
                company=company,
                location=location,
                remote=remote,
                salary_min=sal_min,
                salary_max=sal_max,
                url=url,
                source=JobSource.ziprecruiter,
                description_snippet=snippet,
                posted_at=posted_at,
            ))
    return jobs


def _extract_from_html(soup: BeautifulSoup, remote_search: bool) -> list[JobListing]:
    jobs = []
    for card in soup.find_all("div", class_=re.compile(r"job_result|jobList")):
        title_el = card.find(class_=re.compile(r"job_title|jobTitle"))
        company_el = card.find(class_=re.compile(r"job_company|company"))
        loc_el = card.find(class_=re.compile(r"job_location|location"))
        link_el = card.find("a", href=True)
        salary_el = card.find(class_=re.compile(r"salary"))

        title = title_el.get_text(strip=True) if title_el else ""
        company = company_el.get_text(strip=True) if company_el else ""
        location = loc_el.get_text(strip=True) if loc_el else None
        url = link_el["href"] if link_el else ""
        if url and not url.startswith("http"):
            url = f"https://www.ziprecruiter.com{url}"

        sal_text = salary_el.get_text(strip=True) if salary_el else ""
        sal_min, sal_max = _parse_salary_range(sal_text)

        is_remote = remote_search or "remote" in (location or "").lower() or "remote" in title.lower()

        if not title or not url:
            continue
        uid = hashlib.md5(url.encode()).hexdigest()
        jobs.append(JobListing(
            id=uid,
            title=title,
            company=company,
            location=location,
            remote=is_remote,
            salary_min=sal_min,
            salary_max=sal_max,
            url=url,
            source=JobSource.ziprecruiter,
        ))
    return jobs


class ZipRecruiterCrawler(BaseCrawler):
    source = "ziprecruiter"

    async def fetch(self, req: SearchRequest) -> list[JobListing]:
        params: dict = {"search": req.title}
        if req.location:
            params["location"] = req.location
        if req.remote:
            params["search"] = f"{req.title} remote"
        if req.date_posted.value in _DATE_MAP:
            params["days"] = _DATE_MAP[req.date_posted.value]
        if req.salary_min:
            params["refine_by_salary"] = req.salary_min

        url = f"{_SEARCH_URL}?{urlencode(params)}"
        try:
            async with httpx.AsyncClient(
                headers=_HEADERS, follow_redirects=True, timeout=20
            ) as client:
                resp = await client.get(url)
                if resp.status_code != 200:
                    print(f"[ziprecruiter] HTTP {resp.status_code}")
                    return []

                soup = BeautifulSoup(resp.text, "html.parser")
                jobs = _extract_from_jsonld(soup)
                if not jobs:
                    jobs = _extract_from_html(soup, req.remote)
                return jobs
        except Exception as exc:
            print(f"[ziprecruiter] error: {exc}")
            return []
