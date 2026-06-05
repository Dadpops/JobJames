from app.models.job import JobListing
from app.models.search import SearchRequest


def score_and_rank(jobs: list[JobListing], req: SearchRequest) -> list[JobListing]:
    scored = [_score(job, req) for job in jobs]
    return sorted(scored, key=lambda j: j.score, reverse=True)


def _score(job: JobListing, req: SearchRequest) -> JobListing:
    breakdown: dict[str, int] = {}
    score = 0.0

    if req.title.lower() in job.title.lower():
        breakdown["title_match"] = 40
        score += 40.0

    if req.remote and job.remote:
        breakdown["remote_bonus"] = 20
        score += 20.0
    elif req.remote and not job.remote:
        breakdown["remote_penalty"] = -10
        score -= 10.0

    if req.salary_min and job.salary_max and job.salary_max >= req.salary_min:
        breakdown["salary_min_match"] = 20
        score += 20.0

    if req.salary_max and job.salary_min and job.salary_min <= req.salary_max:
        breakdown["salary_max_match"] = 10
        score += 10.0

    if req.location and job.location and req.location.lower() in job.location.lower():
        breakdown["location_match"] = 10
        score += 10.0

    return job.model_copy(update={"score": round(score, 2), "score_breakdown": breakdown})
