from app.models.job import JobListing


def deduplicate(jobs: list[JobListing]) -> list[JobListing]:
    """Remove duplicate listings by (title, company) fingerprint."""
    seen: set[str] = set()
    unique: list[JobListing] = []
    for job in jobs:
        key = f"{job.title.lower()}|{job.company.lower()}"
        if key not in seen:
            seen.add(key)
            unique.append(job)
    return unique
