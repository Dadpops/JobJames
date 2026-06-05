"""APScheduler integration — runs saved searches and sends email digests."""
import json
import logging
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.database import (
    get_all_settings,
    get_overdue_tracker_items,
    get_saved_searches,
    touch_saved_search,
    upsert_jobs,
)

log = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()

_DIGEST_JOB_ID = "email_digest"


# ── Scheduled search runner ───────────────────────────────────────────────────

async def run_saved_search(search_id: str) -> int:
    from app.crawlers import run_crawlers
    from app.database import get_saved_search
    from app.models.search import SearchRequest
    from app.services.deduplication import deduplicate
    from app.services.scoring import score_and_rank
    from app.api.jobs import _to_row

    row = await get_saved_search(search_id)
    if not row:
        return 0

    criteria = json.loads(row["criteria_json"])
    req = SearchRequest(**criteria)
    raw = await run_crawlers(req)
    unique = deduplicate(raw)
    ranked = score_and_rank(unique, req)
    await upsert_jobs([_to_row(j) for j in ranked])
    await touch_saved_search(search_id)
    log.info("Ran saved search '%s' — %d results", row["name"], len(ranked))
    return len(ranked)


# ── Digest sender ─────────────────────────────────────────────────────────────

async def send_digest() -> None:
    from app.services.email_service import send_email

    cfg = await get_all_settings()
    to = cfg.get("digest_to", "")
    if not to:
        return

    overdue = await get_overdue_tracker_items()

    html = _build_digest_html(overdue)
    try:
        await send_email(to, "JobJames — Daily Digest", html)
        log.info("Digest sent to %s", to)
    except Exception as exc:
        log.error("Digest send failed: %s", exc)


def _build_digest_html(overdue: list[dict]) -> str:
    now = datetime.now().strftime("%B %d, %Y")
    overdue_rows = ""
    for item in overdue:
        deadline = item.get("deadline") or ""
        followup = item.get("followup_date") or ""
        overdue_rows += f"""
        <tr>
          <td style="padding:8px;border-bottom:1px solid #2a2d3a;">{item['title']}</td>
          <td style="padding:8px;border-bottom:1px solid #2a2d3a;">{item['company']}</td>
          <td style="padding:8px;border-bottom:1px solid #2a2d3a;color:#e05c6a;">{deadline or '—'}</td>
          <td style="padding:8px;border-bottom:1px solid #2a2d3a;color:#e8b84b;">{followup or '—'}</td>
          <td style="padding:8px;border-bottom:1px solid #2a2d3a;">{item['status']}</td>
        </tr>"""

    overdue_section = ""
    if overdue:
        overdue_section = f"""
        <h2 style="color:#e05c6a;margin-top:32px;">⚠ Overdue Items ({len(overdue)})</h2>
        <table style="width:100%;border-collapse:collapse;background:#1a1d27;border-radius:8px;overflow:hidden;">
          <thead><tr>
            <th style="padding:8px;text-align:left;color:#7a7e9a;font-size:11px;text-transform:uppercase;">Title</th>
            <th style="padding:8px;text-align:left;color:#7a7e9a;font-size:11px;text-transform:uppercase;">Company</th>
            <th style="padding:8px;text-align:left;color:#7a7e9a;font-size:11px;text-transform:uppercase;">Deadline</th>
            <th style="padding:8px;text-align:left;color:#7a7e9a;font-size:11px;text-transform:uppercase;">Follow-up</th>
            <th style="padding:8px;text-align:left;color:#7a7e9a;font-size:11px;text-transform:uppercase;">Status</th>
          </tr></thead>
          <tbody>{overdue_rows}</tbody>
        </table>"""
    else:
        overdue_section = '<p style="color:#4caf82;">✓ No overdue items</p>'

    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#0f1117;color:#e2e4f0;font-family:system-ui,sans-serif;padding:32px;">
  <h1 style="color:#6c8ef7;">JobJames — Daily Digest</h1>
  <p style="color:#7a7e9a;">{now}</p>
  {overdue_section}
  <p style="color:#7a7e9a;font-size:12px;margin-top:32px;">Sent by JobJames</p>
</body>
</html>"""


# ── Scheduler lifecycle ───────────────────────────────────────────────────────

def _parse_time(t: str) -> tuple[int, int]:
    parts = (t or "08:00").split(":")
    return int(parts[0]), int(parts[1])


def _schedule_search(row: dict) -> None:
    job_id = f"search_{row['id']}"
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)

    if not row["is_enabled"] or row["schedule"] == "off":
        return

    h, m = _parse_time("08:00")
    if row["schedule"] == "daily":
        trigger = CronTrigger(hour=h, minute=m)
    else:  # twice_daily
        trigger = CronTrigger(hour=f"{h},{(h + 12) % 24}", minute=m)

    scheduler.add_job(
        run_saved_search,
        trigger=trigger,
        args=[row["id"]],
        id=job_id,
        replace_existing=True,
    )
    log.info("Scheduled search '%s' (%s)", row["name"], row["schedule"])


def reschedule_search(row: dict) -> None:
    _schedule_search(row)


async def start(app=None) -> None:
    searches = await get_saved_searches()
    for row in searches:
        _schedule_search(row)

    cfg = await get_all_settings()
    freq = cfg.get("digest_frequency", "off")
    if freq != "off":
        h, m = _parse_time(cfg.get("digest_time", "08:00"))
        trigger = CronTrigger(hour=h, minute=m) if freq == "daily" else CronTrigger(day_of_week="mon", hour=h, minute=m)
        scheduler.add_job(send_digest, trigger=trigger, id=_DIGEST_JOB_ID, replace_existing=True)

    scheduler.start()
    log.info("Scheduler started with %d job(s)", len(scheduler.get_jobs()))


def reschedule_digest(freq: str, time_str: str) -> None:
    if scheduler.get_job(_DIGEST_JOB_ID):
        scheduler.remove_job(_DIGEST_JOB_ID)
    if freq == "off":
        return
    h, m = _parse_time(time_str or "08:00")
    trigger = CronTrigger(hour=h, minute=m) if freq == "daily" else CronTrigger(day_of_week="mon", hour=h, minute=m)
    scheduler.add_job(send_digest, trigger=trigger, id=_DIGEST_JOB_ID, replace_existing=True)
