"""SQLite persistence layer."""
import json
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
    updated_at          TEXT NOT NULL DEFAULT (datetime('now')),
    sources             TEXT,
    score_breakdown     TEXT
);

CREATE TABLE IF NOT EXISTS tracker (
    id                TEXT PRIMARY KEY,
    title             TEXT NOT NULL,
    company           TEXT NOT NULL,
    location          TEXT,
    url               TEXT,
    status            TEXT NOT NULL DEFAULT 'Found',
    date_added        TEXT NOT NULL DEFAULT (date('now')),
    followup_date     TEXT,
    deadline          TEXT,
    notes             TEXT,
    tags              TEXT DEFAULT '[]',
    recruiter_name    TEXT,
    recruiter_email   TEXT,
    recruiter_linkedin TEXT,
    last_contact_date TEXT,
    target_salary     INTEGER,
    salary_min        INTEGER,
    salary_max        INTEGER,
    company_size      TEXT,
    company_industry  TEXT,
    company_notes     TEXT
);

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS saved_searches (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    criteria_json TEXT NOT NULL,
    schedule     TEXT NOT NULL DEFAULT 'off',
    is_enabled   INTEGER NOT NULL DEFAULT 1,
    last_run     TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
"""

# Columns added after initial release — silently ignored if they already exist
_MIGRATIONS = [
    "ALTER TABLE jobs ADD COLUMN sources TEXT",
    "ALTER TABLE jobs ADD COLUMN score_breakdown TEXT",
    "ALTER TABLE tracker ADD COLUMN deadline TEXT",
    "ALTER TABLE tracker ADD COLUMN tags TEXT DEFAULT '[]'",
    "ALTER TABLE tracker ADD COLUMN recruiter_name TEXT",
    "ALTER TABLE tracker ADD COLUMN recruiter_email TEXT",
    "ALTER TABLE tracker ADD COLUMN recruiter_linkedin TEXT",
    "ALTER TABLE tracker ADD COLUMN last_contact_date TEXT",
    "ALTER TABLE tracker ADD COLUMN target_salary INTEGER",
    "ALTER TABLE tracker ADD COLUMN salary_min INTEGER",
    "ALTER TABLE tracker ADD COLUMN salary_max INTEGER",
    "ALTER TABLE tracker ADD COLUMN company_size TEXT",
    "ALTER TABLE tracker ADD COLUMN company_industry TEXT",
    "ALTER TABLE tracker ADD COLUMN company_notes TEXT",
    "ALTER TABLE tracker ADD COLUMN sort_order INTEGER",
    "ALTER TABLE saved_searches ADD COLUMN recipient_email TEXT",
    "ALTER TABLE saved_searches ADD COLUMN result_limit INTEGER DEFAULT 10",
]


async def init_db() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(_SCHEMA)
        for sql in _MIGRATIONS:
            try:
                await db.execute(sql)
            except Exception:
                pass
        await db.commit()


# ── Jobs ──────────────────────────────────────────────────────────────────────

async def upsert_jobs(jobs: list[dict]) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executemany(
            """
            INSERT INTO jobs (id, title, company, location, remote, salary_min,
                              salary_max, url, source, description_snippet,
                              posted_at, score, status, sources, score_breakdown)
            VALUES (:id,:title,:company,:location,:remote,:salary_min,
                    :salary_max,:url,:source,:description_snippet,
                    :posted_at,:score,:status,:sources,:score_breakdown)
            ON CONFLICT(id) DO UPDATE SET
                score           = excluded.score,
                sources         = excluded.sources,
                score_breakdown = excluded.score_breakdown,
                updated_at      = datetime('now')
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


async def get_dismissed_jobs() -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM jobs WHERE status = 'dismissed' ORDER BY updated_at DESC"
        ) as cur:
            return [dict(r) for r in await cur.fetchall()]


# ── Tracker ───────────────────────────────────────────────────────────────────

def _parse_tracker_row(row: dict) -> dict:
    row["tags"] = json.loads(row.get("tags") or "[]")
    return row


async def get_tracker_entries() -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM tracker ORDER BY COALESCE(sort_order, 999999) ASC, date_added DESC"
        ) as cur:
            return [_parse_tracker_row(dict(r)) for r in await cur.fetchall()]


async def create_tracker_entry(entry: dict) -> dict:
    entry = dict(entry)
    entry["tags"] = json.dumps(entry.get("tags") or [])
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO tracker
               (id,title,company,location,url,status,date_added,followup_date,
                deadline,notes,tags,recruiter_name,recruiter_email,recruiter_linkedin,
                last_contact_date,target_salary,salary_min,salary_max,
                company_size,company_industry,company_notes)
               VALUES
               (:id,:title,:company,:location,:url,:status,:date_added,:followup_date,
                :deadline,:notes,:tags,:recruiter_name,:recruiter_email,:recruiter_linkedin,
                :last_contact_date,:target_salary,:salary_min,:salary_max,
                :company_size,:company_industry,:company_notes)""",
            entry,
        )
        await db.commit()
    return await get_tracker_entry(entry["id"])


async def update_tracker_entry(entry_id: str, fields: dict) -> dict | None:
    if not fields:
        return await get_tracker_entry(entry_id)
    if "tags" in fields:
        fields["tags"] = json.dumps(fields["tags"])
    set_clause = ", ".join(f"{k} = :{k}" for k in fields)
    fields["entry_id"] = entry_id
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            f"UPDATE tracker SET {set_clause} WHERE id = :entry_id", fields
        )
        await db.commit()
    return await get_tracker_entry(entry_id)


async def get_tracker_entry(entry_id: str) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM tracker WHERE id = ?", (entry_id,)) as cur:
            row = await cur.fetchone()
            return _parse_tracker_row(dict(row)) if row else None


async def delete_tracker_entry(entry_id: str) -> bool:
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute("DELETE FROM tracker WHERE id = ?", (entry_id,))
        await db.commit()
        return cur.rowcount > 0


# ── Settings ──────────────────────────────────────────────────────────────────

async def get_all_settings() -> dict:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT key, value FROM settings") as cur:
            return {r["key"]: r["value"] for r in await cur.fetchall()}


async def get_setting(key: str) -> str | None:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT value FROM settings WHERE key = ?", (key,)) as cur:
            row = await cur.fetchone()
            return row["value"] if row else None


async def set_settings(pairs: dict) -> dict:
    async with aiosqlite.connect(DB_PATH) as db:
        for key, value in pairs.items():
            if value is None:
                await db.execute("DELETE FROM settings WHERE key = ?", (key,))
            else:
                await db.execute(
                    "INSERT INTO settings (key, value) VALUES (?, ?) "
                    "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                    (key, str(value)),
                )
        await db.commit()
    return await get_all_settings()


# ── Saved Searches ────────────────────────────────────────────────────────────

async def get_saved_searches() -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM saved_searches ORDER BY created_at DESC"
        ) as cur:
            return [dict(r) for r in await cur.fetchall()]


async def get_saved_search(search_id: str) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM saved_searches WHERE id = ?", (search_id,)
        ) as cur:
            row = await cur.fetchone()
            return dict(row) if row else None


async def create_saved_search(row: dict) -> dict:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO saved_searches
               (id, name, criteria_json, schedule, is_enabled, created_at, recipient_email, result_limit)
               VALUES (:id, :name, :criteria_json, :schedule, :is_enabled, :created_at,
                       :recipient_email, :result_limit)""",
            row,
        )
        await db.commit()
    return await get_saved_search(row["id"])


async def bulk_reorder_tracker(items: list[dict]) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executemany(
            "UPDATE tracker SET sort_order = :sort_order WHERE id = :id", items
        )
        await db.commit()


async def update_saved_search(search_id: str, fields: dict) -> dict | None:
    if not fields:
        return await get_saved_search(search_id)
    set_clause = ", ".join(f"{k} = :{k}" for k in fields)
    fields["search_id"] = search_id
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            f"UPDATE saved_searches SET {set_clause} WHERE id = :search_id", fields
        )
        await db.commit()
    return await get_saved_search(search_id)


async def delete_saved_search(search_id: str) -> bool:
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute(
            "DELETE FROM saved_searches WHERE id = ?", (search_id,)
        )
        await db.commit()
        return cur.rowcount > 0


async def touch_saved_search(search_id: str) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE saved_searches SET last_run = datetime('now') WHERE id = ?",
            (search_id,),
        )
        await db.commit()


async def get_overdue_tracker_items() -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """SELECT * FROM tracker
               WHERE (deadline IS NOT NULL AND deadline < date('now'))
                  OR (followup_date IS NOT NULL AND followup_date < date('now'))
               ORDER BY deadline ASC"""
        ) as cur:
            return [_parse_tracker_row(dict(r)) for r in await cur.fetchall()]
