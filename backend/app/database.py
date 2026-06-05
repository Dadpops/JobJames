"""SQLite persistence layer — replaces the Phase-1 in-memory dict."""
import aiosqlite

DB_PATH = "jobjames.db"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS jobs (
    id                  TEXT PRIMARY KEY,
    title               TEXT NOT NULL,
    company             TEXT NOT NULL,
    location            TEXT,
    remote              INTEGER NOT NULL DEFAULT 0,
    salary_min          INTEGER,
    salary_max          INTEGER,
    url                 TEXT NOT NULL,
    source              TEXT NOT NULL,
    description_snippet TEXT,
    posted_at           TEXT,
    score               REAL NOT NULL DEFAULT 0,
    status              TEXT NOT NULL DEFAULT 'new',
    updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
"""


async def init_db() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(_SCHEMA)
        await db.commit()


async def upsert_jobs(jobs: list[dict]) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executemany(
            """
            INSERT INTO jobs (id, title, company, location, remote, salary_min,
                              salary_max, url, source, description_snippet,
                              posted_at, score, status)
            VALUES (:id,:title,:company,:location,:remote,:salary_min,
                    :salary_max,:url,:source,:description_snippet,
                    :posted_at,:score,:status)
            ON CONFLICT(id) DO UPDATE SET
                score      = excluded.score,
                updated_at = datetime('now')
            """,
            jobs,
        )
        await db.commit()


async def get_job(job_id: str) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)) as cur:
            row = await cur.fetchone()
            return dict(row) if row else None


async def set_status(job_id: str, status: str) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE jobs SET status = ?, updated_at = datetime('now') WHERE id = ?",
            (status, job_id),
        )
        await db.commit()
    return await get_job(job_id)


async def get_saved_jobs() -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM jobs WHERE status = 'saved' ORDER BY score DESC, updated_at DESC"
        ) as cur:
            return [dict(r) for r in await cur.fetchall()]
