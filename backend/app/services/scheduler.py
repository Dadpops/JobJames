"""APScheduler integration — runs saved searches and sends per-user email digests."""
import json
import logging
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.database import (
    get_all_settings,
    get_all_saved_searches_for_scheduler,
    get_overdue_tracker_items,
    get_saved_search_by_id,
    touch_saved_search,
    upsert_jobs,
)

log = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


# ── Scheduled search runner ───────────────────────────────────────────────────


async def run_saved_search(search_id: str) -> int:
    from app.crawlers import run_crawlers
    from app.models.search import SearchRequest
    from app.services.deduplication import deduplicate
    from app.services.scoring import score_and_rank
    from app.api.jobs import _to_row

    row = await get_saved_search_by_id(search_id)
    if not row:
        return 0

    access_code = row["access_code"]
    criteria = json.loads(row["criteria_json"])
    req = SearchRequest(**criteria)
    raw = await run_crawlers(req)
    unique = deduplicate(raw)
    ranked = score_and_rank(unique, req)
    await upsert_jobs([_to_row(j) for j in ranked], access_code)
    await touch_saved_search(search_id, access_code)
    log.info("Ran saved search '%s' — %d results", row["name"], len(ranked))

    email_to = (row.get("recipient_email") or "").strip()
    if email_to and ranked:
        from app.services.email_service import send_email
        limit = int(row.get("result_limit") or 10)
        top = ranked[:limit]
        html = _build_search_results_html(row["name"], top)
        try:
            await send_email(email_to, f"JobJames — {row['name']}", html, access_code)
            log.info("Search results emailed to %s", email_to)
        except Exception as exc:
            log.error("Search results email failed: %s", exc)

    return len(ranked)


def _build_search_results_html(search_name: str, jobs: list) -> str:
    now = datetime.now().strftime("%B %d, %Y")
    rows = ""
    for job in jobs:
        salary = ""
        if job.salary_min or job.salary_max:
            lo = f"${job.salary_min:,}" if job.salary_min else ""
            hi = f"${job.salary_max:,}" if job.salary_max else ""
            salary = f"{lo}–{hi}" if lo and hi else lo or hi
        rows += f"""
        <tr>
          <td style="padding:8px;border-bottom:1px solid #2a2d3a;">
            <a href="{job.url}" style="color:#6c8ef7;text-decoration:none;">{job.title}</a>
          </td>
          <td style="padding:8px;border-bottom:1px solid #2a2d3a;">{job.company}</td>
          <td style="padding:8px;border-bottom:1px solid #2a2d3a;color:#7a7e9a;">{job.location or '—'}</td>
          <td style="padding:8px;border-bottom:1px solid #2a2d3a;color:#7a7e9a;">{salary or '—'}</td>
          <td style="padding:8px;border-bottom:1px solid #2a2d3a;color:#7a7e9a;">{job.source}</td>
        </tr>"""
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#0f1117;color:#e2e4f0;font-family:system-ui,sans-serif;padding:32px;">
  <h1 style="color:#6c8ef7;">JobJames — {search_name}</h1>
  <p style="color:#7a7e9a;">{now} · {len(jobs)} result{'s' if len(jobs) != 1 else ''}</p>
  <table style="width:100%;border-collapse:collapse;background:#1a1d27;border-radius:8px;overflow:hidden;">
    <thead><tr>
      <th style="padding:8px;text-align:left;color:#7a7e9a;font-size:11px;text-transform:uppercase;">Title</th>
      <th style="padding:8px;text-align:left;color:#7a7e9a;font-size:11px;text-transform:uppercase;">Company</th>
      <th style="padding:8px;text-align:left;color:#7a7e9a;font-size:11px;text-transform:uppercase;">Location</th>
      <th style="padding:8px;text-align:left;color:#7a7e9a;font-size:11px;text-transform:uppercase;">Salary</th>
      <th style="padding:8px;text-align:left;color:#7a7e9a;font-size:11px;text-transform:uppercase;">Source</th>
    </tr></thead>
    <tbody>{rows}</tbody>
  </table>
  <p style="color:#7a7e9a;font-size:12px;margin-top:32px;">Sent by JobJames</p>
</body>
</html>"""


# ── Per-user digest ───────────────────────────────────────────────────────────


async def send_digest(access_code: str) -> None:
    from app.services.email_service import send_email

    cfg = await get_all_settings(access_code)
    to = cfg.get("digest_to", "")
    if not to:
        return

    overdue = await get_overdue_tracker_items(access_code)
    html = _build_digest_html(overdue)
    try:
        await send_email(to, "JobJames — Daily Digest", html, access_code)
        log.info("Digest sent to %s (user %s)", to, access_code)
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
    else:
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


def reschedule_digest(freq: str, time_str: str, access_code: str) -> None:
    job_id = f"email_digest_{access_code}"
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
    if freq == "off":
        return
    h, m = _parse_time(time_str or "08:00")
    trigger = (
        CronTrigger(hour=h, minute=m)
        if freq == "daily"
        else CronTrigger(day_of_week="mon", hour=h, minute=m)
    )
    scheduler.add_job(
        send_digest,
        trigger=trigger,
        args=[access_code],
        id=job_id,
        replace_existing=True,
    )


async def start(app=None) -> None:
    searches = await get_all_saved_searches_for_scheduler()
    for row in searches:
        _schedule_search(row)

    scheduler.start()
    log.info("Scheduler started with %d job(s)", len(scheduler.get_jobs()))
