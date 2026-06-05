from app.crawlers.greenhouse import GreenhouseCrawler
from app.crawlers.indeed import IndeedCrawler
from app.crawlers.lever import LeverCrawler
from app.crawlers.linkedin import LinkedInCrawler
from app.models.job import JobListing
from app.models.search import SearchRequest

_CRAWLERS = [IndeedCrawler, GreenhouseCrawler, LeverCrawler, LinkedInCrawler]


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
