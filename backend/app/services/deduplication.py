from app.models.job import JobListing


def deduplicate(jobs: list[JobListing]) -> list[JobListing]:
    """Merge listings with the same (title, company) fingerprint, collecting all sources."""
    index: dict[str, int] = {}
    unique: list[JobListing] = []

    for job in jobs:
        key = f"{job.title.lower().strip()}|{job.company.lower().strip()}"
        initial_sources = job.sources if job.sources else [job.source.value]

        if key in index:
            existing = unique[index[key]]
            merged = list(dict.fromkeys(existing.sources + initial_sources))
            unique[index[key]] = existing.model_copy(update={"sources": merged})
        else:
            index[key] = len(unique)
            unique.append(job.model_copy(update={"sources": initial_sources}))

    return unique
