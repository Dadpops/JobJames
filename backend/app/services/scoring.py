from app.models.job import JobListing
from app.models.search import SearchRequest


def score_and_rank(jobs: list[JobListing], req: SearchRequest) -> list[JobListing]:
    """Score each job against search criteria and return sorted descending."""
    scored = [_score(job, req) for job in jobs]
    return sorted(scored, key=lambda j: j.score, reverse=True)


def _score(job: JobListing, req: SearchRequest) -> JobListing:
    score = 0.0

    # Title match
    if req.title.lower() in job.title.lower():
        score += 40.0

    # Remote match
    if req.remote and job.remote:
        score += 20.0
    elif req.remote and not job.remote:
        score -= 10.0

    # Salary overlap
    if req.salary_min and job.salary_max:
        if job.salary_max >= req.salary_min:
            score += 20.0
    if req.salary_max and job.salary_min:
        if job.salary_min <= req.salary_max:
            score += 10.0

    # Location match
    if req.location and job.location:
        if req.location.lower() in job.location.lower():
            score += 10.0

    return job.model_copy(update={"score": round(score, 2)})
