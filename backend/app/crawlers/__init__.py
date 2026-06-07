from app.crawlers.glassdoor import GlassdoorCrawler
from app.crawlers.greenhouse import GreenhouseCrawler
from app.crawlers.indeed import IndeedCrawler
from app.crawlers.lever import LeverCrawler
from app.crawlers.linkedin import LinkedInCrawler
from app.crawlers.remoteok import RemoteOKCrawler
from app.crawlers.weworkremotely import WeWorkRemotelyCrawler
from app.crawlers.wellfound import WellfoundCrawler
from app.crawlers.ziprecruiter import ZipRecruiterCrawler
from app.models.job import JobListing
from app.models.search import SearchRequest

_CRAWLERS = [
    IndeedCrawler,
    GreenhouseCrawler,
    LeverCrawler,
    LinkedInCrawler,
    GlassdoorCrawler,
    WellfoundCrawler,
    ZipRecruiterCrawler,
    RemoteOKCrawler,
    WeWorkRemotelyCrawler,
]


async def run_crawlers(req: SearchRequest) -> list[JobListing]:
    results: list[JobListing] = []
    for CrawlerClass in _CRAWLERS:
        if CrawlerClass.source in req.sources:
            crawler = CrawlerClass()
            try:
                jobs = await crawler.fetch(req)
                results.extend(jobs)
            except Exception as exc:
                # Best-effort: log and continue if one source fails
                print(f"[{CrawlerClass.source}] crawler error: {exc}")
    return results
