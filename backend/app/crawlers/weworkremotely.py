import hashlib
import xml.etree.ElementTree as ET
from urllib.parse import urlencode

import httpx
from bs4 import BeautifulSoup

from app.crawlers.base import BaseCrawler
from app.models.job import JobListing, JobSource
from app.models.search import SearchRequest

_SEARCH_URL = "https://weworkremotely.com/remote-jobs/search"
_RSS_URL = "https://weworkremotely.com/remote-jobs.rss"
_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; JobJames/1.0)",
    "Accept": "text/html,application/xhtml+xml,*/*",
}


def _score_match(title: str, query: str) -> bool:
    """Return True if title is a reasonable match for the query."""
    q_words = set(query.lower().split())
    t_words = set(title.lower().split())
    return bool(q_words & t_words)


class WeWorkRemotelyCrawler(BaseCrawler):
    source = "weworkremotely"

    async def fetch(self, req: SearchRequest) -> list[JobListing]:
        jobs = await self._fetch_search(req)
        if not jobs:
            jobs = await self._fetch_rss(req)
        return jobs

    async def _fetch_search(self, req: SearchRequest) -> list[JobListing]:
        params = {"term": req.title}
        url = f"{_SEARCH_URL}?{urlencode(params)}"
        try:
            async with httpx.AsyncClient(
                headers=_HEADERS, follow_redirects=True, timeout=20
            ) as client:
                resp = await client.get(url)
                if resp.status_code != 200:
                    print(f"[weworkremotely] HTTP {resp.status_code}")
                    return []

                soup = BeautifulSoup(resp.text, "html.parser")
                return _parse_html(soup)
        except Exception as exc:
            print(f"[weworkremotely] search error: {exc}")
            return []

    async def _fetch_rss(self, req: SearchRequest) -> list[JobListing]:
        """Fallback: fetch the global RSS feed and filter by query."""
        try:
            async with httpx.AsyncClient(
                headers=_HEADERS, follow_redirects=True, timeout=20
            ) as client:
                resp = await client.get(_RSS_URL)
                if resp.status_code != 200:
                    return []
                return _parse_rss(resp.text, req.title)
        except Exception as exc:
            print(f"[weworkremotely] rss error: {exc}")
            return []


def _parse_html(soup: BeautifulSoup) -> list[JobListing]:
    jobs = []
    # Jobs are inside <section class="jobs"> → <ul> → <li> → <a>
    for section in soup.find_all("section", class_=lambda c: c and "jobs" in c):
        for a in section.find_all("a", href=lambda h: h and "/remote-jobs/" in h):
            title_el = a.find(class_=lambda c: c and "title" in c.lower() if c else False)
            company_el = a.find(class_=lambda c: c and "company" in c.lower() if c else False)
            region_el = a.find(class_=lambda c: c and "region" in c.lower() if c else False)
            date_el = a.find("time")

            title = title_el.get_text(strip=True) if title_el else a.get_text(strip=True)
            company = company_el.get_text(strip=True) if company_el else ""
            location = region_el.get_text(strip=True) if region_el else "Remote"
            href = a.get("href", "")
            job_url = f"https://weworkremotely.com{href}" if href.startswith("/") else href
            posted_at = date_el.get("datetime") if date_el else None

            if not title or not job_url:
                continue
            uid = hashlib.md5(job_url.encode()).hexdigest()
            jobs.append(JobListing(
                id=uid,
                title=title,
                company=company,
                location=location or "Remote",
                remote=True,
                url=job_url,
                source=JobSource.weworkremotely,
                posted_at=posted_at,
            ))
    return jobs


def _parse_rss(xml_text: str, query: str) -> list[JobListing]:
    jobs = []
    try:
        root = ET.fromstring(xml_text)
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        for item in root.iter("item"):
            raw_title = (item.findtext("title") or "").strip()
            link = (item.findtext("link") or "").strip()
            pub_date = (item.findtext("pubDate") or "").strip()
            region = (item.findtext("region") or "Remote").strip()

            # Raw title format: "Company Name: Job Title"
            if ": " in raw_title:
                company, title = raw_title.split(": ", 1)
            else:
                company, title = "", raw_title

            company = company.strip()
            title = title.strip()

            if not _score_match(title, query):
                continue
            if not title or not link:
                continue

            uid = hashlib.md5(link.encode()).hexdigest()
            jobs.append(JobListing(
                id=uid,
                title=title,
                company=company,
                location=region,
                remote=True,
                url=link,
                source=JobSource.weworkremotely,
                posted_at=pub_date or None,
            ))
    except ET.ParseError as exc:
        print(f"[weworkremotely] rss parse error: {exc}")
    return jobs
