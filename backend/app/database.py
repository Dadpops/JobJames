"""Async database layer — SQLite (local dev) or PostgreSQL (production).

DATABASE_URL formats accepted:
  jobjames.db                        -> SQLite, relative path
  sqlite:///./jobjames.db            -> SQLite, explicit URI
  postgres://user:pass@host/db       -> PostgreSQL (Railway format)
  postgresql://user:pass@host/db     -> PostgreSQL
"""
import json
import os
from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlalchemy.pool import StaticPool

# ── Engine setup ──────────────────────────────────────────────────────────────


def _make_url(raw: str) -> str:
    if raw.startswith("postgres://"):
        return raw.replace("postgres://", "postgresql+asyncpg://", 1)
    if raw.startswith("postgresql://"):
        return raw.replace("postgresql://", "postgresql+asyncpg://", 1)
    if raw.startswith(("postgresql+asyncpg://", "sqlite+aiosqlite://")):
        return raw
    if raw.startswith("sqlite:///"):
        return raw.replace("sqlite:///", "sqlite+aiosqlite:///", 1)
    return f"sqlite+aiosqlite:///{raw}"


_DB_URL = _make_url(os.getenv("DATABASE_URL", "jobjames.db"))
_IS_SQLITE = "sqlite" in _DB_URL

if _IS_SQLITE:
    _engine: AsyncEngine = create_async_engine(
        _DB_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
else:
    _engine: AsyncEngine = create_async_engine(
        _DB_URL,
        pool_pre_ping=True,
        connect_args={"ssl": False, "timeout": 15},
    )


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


# ── Schema ────────────────────────────────────────────────────────────────────

_SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    access_code  TEXT PRIMARY KEY,
    display_name TEXT,
    created_at   TEXT
);

CREATE TABLE IF NOT EXISTS jobs (
    id                  TEXT NOT NULL,
    access_code         TEXT NOT NULL,
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
    updated_at          TEXT,
    sources             TEXT,
    score_breakdown     TEXT,
    PRIMARY KEY (id, access_code)
);

CREATE TABLE IF NOT EXISTS tracker (
    id                 TEXT NOT NULL,
    access_code        TEXT NOT NULL,
    title              TEXT NOT NULL,
    company            TEXT NOT NULL,
    location           TEXT,
    url                TEXT,
    status             TEXT NOT NULL DEFAULT 'Found',
    date_added         TEXT,
    followup_date      TEXT,
    deadline           TEXT,
    notes              TEXT,
    tags               TEXT DEFAULT '[]',
    recruiter_name     TEXT,
    recruiter_email    TEXT,
    recruiter_linkedin TEXT,
    last_contact_date  TEXT,
    target_salary      INTEGER,
    salary_min         INTEGER,
    salary_max         INTEGER,
    company_size       TEXT,
    company_industry   TEXT,
    company_notes      TEXT,
    sort_order         INTEGER,
    PRIMARY KEY (id, access_code)
);

CREATE TABLE IF NOT EXISTS settings (
    key         TEXT NOT NULL,
    access_code TEXT NOT NULL,
    value       TEXT NOT NULL,
    PRIMARY KEY (key, access_code)
);

CREATE TABLE IF NOT EXISTS saved_searches (
    id              TEXT NOT NULL,
    access_code     TEXT NOT NULL,
    name            TEXT NOT NULL,
    criteria_json   TEXT NOT NULL,
    schedule        TEXT NOT NULL DEFAULT 'off',
    is_enabled      INTEGER NOT NULL DEFAULT 1,
    last_run        TEXT,
    created_at      TEXT,
    recipient_email TEXT,
    result_limit    INTEGER DEFAULT 10,
    PRIMARY KEY (id, access_code)
);
"""


async def init_db() -> None:
    statements = [s.strip() for s in _SCHEMA.split(";") if s.strip()]
    async with _engine.begin() as conn:
        for stmt in statements:
            await conn.execute(text(stmt))


# ── Users ─────────────────────────────────────────────────────────────────────


async def get_user(access_code: str) -> dict | None:
    async with _engine.connect() as conn:
        result = await conn.execute(
            text("SELECT * FROM users WHERE access_code = :code"),
            {"code": access_code},
        )
        row = result.mappings().fetchone()
        return dict(row) if row else None


async def create_user(access_code: str, display_name: str = "") -> None:
    async with _engine.begin() as conn:
        await conn.execute(
            text("INSERT INTO users (access_code, display_name, created_at) VALUES (:code, :name, :now)"),
            {"code": access_code, "name": display_name or None, "now": _now()},
        )


# ── Jobs ──────────────────────────────────────────────────────────────────────


async def upsert_jobs(jobs: list[dict], access_code: str) -> None:
    now = _now()
    rows = [{**j, "access_code": access_code, "updated_at": now} for j in jobs]
    async with _engine.begin() as conn:
        await conn.execute(
            text("""
                INSERT INTO jobs (id, access_code, title, company, location, remote,
                                  salary_min, salary_max, url, source, description_snippet,
                                  posted_at, score, status, sources, score_breakdown, updated_at)
                VALUES (:id, :access_code, :title, :company, :location, :remote,
                        :salary_min, :salary_max, :url, :source, :description_snippet,
                        :posted_at, :score, :status, :sources, :score_breakdown, :updated_at)
                ON CONFLICT (id, access_code) DO UPDATE SET
                    score           = EXCLUDED.score,
                    sources         = EXCLUDED.sources,
                    score_breakdown = EXCLUDED.score_breakdown,
                    updated_at      = EXCLUDED.updated_at
            """),
            rows,
        )


async def get_job(job_id: str, access_code: str) -> dict | None:
    async with _engine.connect() as conn:
        result = await conn.execute(
            text("SELECT * FROM jobs WHERE id = :id AND access_code = :ac"),
            {"id": job_id, "ac": access_code},
        )
        row = result.mappings().fetchone()
        return dict(row) if row else None


async def set_status(job_id: str, status: str, access_code: str) -> dict | None:
    async with _engine.begin() as conn:
        await conn.execute(
            text("UPDATE jobs SET status = :status, updated_at = :now WHERE id = :id AND access_code = :ac"),
            {"status": status, "now": _now(), "id": job_id, "ac": access_code},
        )
    return await get_job(job_id, access_code)


async def get_saved_jobs(access_code: str) -> list[dict]:
    async with _engine.connect() as conn:
        result = await conn.execute(
            text("SELECT * FROM jobs WHERE status = 'saved' AND access_code = :ac ORDER BY score DESC, updated_at DESC"),
            {"ac": access_code},
        )
        return [dict(r) for r in result.mappings().fetchall()]


async def get_dismissed_jobs(access_code: str) -> list[dict]:
    async with _engine.connect() as conn:
        result = await conn.execute(
            text("SELECT * FROM jobs WHERE status = 'dismissed' AND access_code = :ac ORDER BY updated_at DESC"),
            {"ac": access_code},
        )
        return [dict(r) for r in result.mappings().fetchall()]


# ── Tracker ───────────────────────────────────────────────────────────────────


def _parse_tracker_row(row: dict) -> dict:
    row["tags"] = json.loads(row.get("tags") or "[]")
    return row


async def get_tracker_entries(access_code: str) -> list[dict]:
    async with _engine.connect() as conn:
        result = await conn.execute(
            text("SELECT * FROM tracker WHERE access_code = :ac ORDER BY COALESCE(sort_order, 999999) ASC, date_added ASC"),
            {"ac": access_code},
        )
        return [_parse_tracker_row(dict(r)) for r in result.mappings().fetchall()]


async def get_tracker_entry(entry_id: str, access_code: str) -> dict | None:
    async with _engine.connect() as conn:
        result = await conn.execute(
            text("SELECT * FROM tracker WHERE id = :id AND access_code = :ac"),
            {"id": entry_id, "ac": access_code},
        )
        row = result.mappings().fetchone()
        return _parse_tracker_row(dict(row)) if row else None


async def create_tracker_entry(entry: dict, access_code: str) -> dict:
    entry = dict(entry)
    entry["tags"] = json.dumps(entry.get("tags") or [])
    entry["access_code"] = access_code
    async with _engine.begin() as conn:
        await conn.execute(
            text("""
                INSERT INTO tracker
                (id, access_code, title, company, location, url, status, date_added,
                 followup_date, deadline, notes, tags, recruiter_name, recruiter_email,
                 recruiter_linkedin, last_contact_date, target_salary, salary_min,
                 salary_max, company_size, company_industry, company_notes)
                VALUES
                (:id, :access_code, :title, :company, :location, :url, :status, :date_added,
                 :followup_date, :deadline, :notes, :tags, :recruiter_name, :recruiter_email,
                 :recruiter_linkedin, :last_contact_date, :target_salary, :salary_min,
                 :salary_max, :company_size, :company_industry, :company_notes)
            """),
            entry,
        )
    return await get_tracker_entry(entry["id"], access_code)


async def update_tracker_entry(entry_id: str, fields: dict, access_code: str) -> dict | None:
    if not fields:
        return await get_tracker_entry(entry_id, access_code)
    if "tags" in fields:
        fields["tags"] = json.dumps(fields["tags"])
    set_clause = ", ".join(f"{k} = :{k}" for k in fields)
    params = {**fields, "entry_id": entry_id, "ac": access_code}
    async with _engine.begin() as conn:
        await conn.execute(
            text(f"UPDATE tracker SET {set_clause} WHERE id = :entry_id AND access_code = :ac"),
            params,
        )
    return await get_tracker_entry(entry_id, access_code)


async def delete_tracker_entry(entry_id: str, access_code: str) -> bool:
    async with _engine.begin() as conn:
        result = await conn.execute(
            text("DELETE FROM tracker WHERE id = :id AND access_code = :ac"),
            {"id": entry_id, "ac": access_code},
        )
        return result.rowcount > 0


async def bulk_reorder_tracker(items: list[dict], access_code: str) -> None:
    async with _engine.begin() as conn:
        for item in items:
            await conn.execute(
                text("UPDATE tracker SET sort_order = :sort_order WHERE id = :id AND access_code = :ac"),
                {**item, "ac": access_code},
            )


async def get_overdue_tracker_items(access_code: str) -> list[dict]:
    today = _today()
    async with _engine.connect() as conn:
        result = await conn.execute(
            text("""
                SELECT * FROM tracker
                WHERE access_code = :ac
                  AND ((deadline IS NOT NULL AND deadline < :today)
                    OR (followup_date IS NOT NULL AND followup_date < :today))
                ORDER BY deadline ASC
            """),
            {"ac": access_code, "today": today},
        )
        return [_parse_tracker_row(dict(r)) for r in result.mappings().fetchall()]


# ── Settings ──────────────────────────────────────────────────────────────────


async def get_all_settings(access_code: str) -> dict:
    async with _engine.connect() as conn:
        result = await conn.execute(
            text("SELECT key, value FROM settings WHERE access_code = :ac"),
            {"ac": access_code},
        )
        return {r["key"]: r["value"] for r in result.mappings().fetchall()}


async def get_setting(key: str, access_code: str) -> str | None:
    async with _engine.connect() as conn:
        result = await conn.execute(
            text("SELECT value FROM settings WHERE key = :key AND access_code = :ac"),
            {"key": key, "ac": access_code},
        )
        row = result.mappings().fetchone()
        return row["value"] if row else None


async def set_settings(pairs: dict, access_code: str) -> dict:
    async with _engine.begin() as conn:
        for key, value in pairs.items():
            if value is None:
                await conn.execute(
                    text("DELETE FROM settings WHERE key = :key AND access_code = :ac"),
                    {"key": key, "ac": access_code},
                )
            else:
                await conn.execute(
                    text("""
                        INSERT INTO settings (key, access_code, value) VALUES (:key, :ac, :value)
                        ON CONFLICT (key, access_code) DO UPDATE SET value = EXCLUDED.value
                    """),
                    {"key": key, "ac": access_code, "value": str(value)},
                )
    return await get_all_settings(access_code)


# ── Saved Searches ────────────────────────────────────────────────────────────


async def get_saved_searches(access_code: str) -> list[dict]:
    async with _engine.connect() as conn:
        result = await conn.execute(
            text("SELECT * FROM saved_searches WHERE access_code = :ac ORDER BY created_at DESC"),
            {"ac": access_code},
        )
        return [dict(r) for r in result.mappings().fetchall()]


async def get_saved_search(search_id: str, access_code: str) -> dict | None:
    async with _engine.connect() as conn:
        result = await conn.execute(
            text("SELECT * FROM saved_searches WHERE id = :id AND access_code = :ac"),
            {"id": search_id, "ac": access_code},
        )
        row = result.mappings().fetchone()
        return dict(row) if row else None


async def get_saved_search_by_id(search_id: str) -> dict | None:
    """Fetch a saved search by ID only — used by the scheduler (no user scope needed)."""
    async with _engine.connect() as conn:
        result = await conn.execute(
            text("SELECT * FROM saved_searches WHERE id = :id"),
            {"id": search_id},
        )
        row = result.mappings().fetchone()
        return dict(row) if row else None


async def get_all_saved_searches_for_scheduler() -> list[dict]:
    """Return all enabled saved searches across all users — used at scheduler startup."""
    async with _engine.connect() as conn:
        result = await conn.execute(
            text("SELECT * FROM saved_searches WHERE is_enabled = 1 ORDER BY created_at ASC")
        )
        return [dict(r) for r in result.mappings().fetchall()]


async def create_saved_search(row: dict, access_code: str) -> dict:
    row = {**row, "access_code": access_code}
    async with _engine.begin() as conn:
        await conn.execute(
            text("""
                INSERT INTO saved_searches
                (id, access_code, name, criteria_json, schedule, is_enabled,
                 created_at, recipient_email, result_limit)
                VALUES (:id, :access_code, :name, :criteria_json, :schedule, :is_enabled,
                        :created_at, :recipient_email, :result_limit)
            """),
            row,
        )
    return await get_saved_search(row["id"], access_code)


async def update_saved_search(search_id: str, fields: dict, access_code: str) -> dict | None:
    if not fields:
        return await get_saved_search(search_id, access_code)
    set_clause = ", ".join(f"{k} = :{k}" for k in fields)
    params = {**fields, "search_id": search_id, "ac": access_code}
    async with _engine.begin() as conn:
        await conn.execute(
            text(f"UPDATE saved_searches SET {set_clause} WHERE id = :search_id AND access_code = :ac"),
            params,
        )
    return await get_saved_search(search_id, access_code)


async def delete_saved_search(search_id: str, access_code: str) -> bool:
    async with _engine.begin() as conn:
        result = await conn.execute(
            text("DELETE FROM saved_searches WHERE id = :id AND access_code = :ac"),
            {"id": search_id, "ac": access_code},
        )
        return result.rowcount > 0


async def touch_saved_search(search_id: str, access_code: str) -> None:
    async with _engine.begin() as conn:
        await conn.execute(
            text("UPDATE saved_searches SET last_run = :now WHERE id = :id AND access_code = :ac"),
            {"now": _now(), "id": search_id, "ac": access_code},
        )
