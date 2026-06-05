import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from app.config import settings
from app.database import get_job, get_saved_jobs

router = APIRouter()

RESEND_URL = "https://api.resend.com/emails"


class EmailRequest(BaseModel):
    to: EmailStr


def _salary_str(j: dict) -> str:
    if j.get("salary_min") and j.get("salary_max"):
        return f"${j['salary_min']:,} – ${j['salary_max']:,}"
    if j.get("salary_min"):
        return f"${j['salary_min']:,}+"
    return "—"


def _job_row(j: dict) -> str:
    return f"""
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #2a2d3a;">
            <a href="{j['url']}" style="color:#6c8ef7;font-weight:600;text-decoration:none;">{j['title']}</a>
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #2a2d3a;color:#e2e4f0;">{j['company']}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #2a2d3a;color:#7a7e9a;">{j.get('location') or '—'}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #2a2d3a;color:#4caf82;">{_salary_str(j)}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #2a2d3a;color:#7a7e9a;text-transform:capitalize;">{j['source']}</td>
        </tr>"""


_TABLE_HEADER = """
  <table style="width:100%;border-collapse:collapse;background:#1a1d27;border-radius:8px;overflow:hidden;">
    <thead>
      <tr style="background:#1a1d27;">
        <th style="padding:10px 8px;text-align:left;color:#7a7e9a;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Title</th>
        <th style="padding:10px 8px;text-align:left;color:#7a7e9a;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Company</th>
        <th style="padding:10px 8px;text-align:left;color:#7a7e9a;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Location</th>
        <th style="padding:10px 8px;text-align:left;color:#7a7e9a;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Salary</th>
        <th style="padding:10px 8px;text-align:left;color:#7a7e9a;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Source</th>
      </tr>
    </thead>
    <tbody>"""

_PAGE_WRAP = """<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#0f1117;color:#e2e4f0;font-family:system-ui,sans-serif;padding:32px;">
  {heading}
  {table}
  <p style="color:#7a7e9a;font-size:12px;margin-top:24px;">Sent by JobJames</p>
</body>
</html>"""


def _build_bulk_html(jobs: list[dict]) -> str:
    rows = "".join(_job_row(j) for j in jobs)
    table = _TABLE_HEADER + rows + "\n    </tbody>\n  </table>"
    heading = (
        f'<h1 style="color:#6c8ef7;margin-bottom:4px;">JobJames — Saved Listings</h1>'
        f'<p style="color:#7a7e9a;margin-bottom:24px;">'
        f"{len(jobs)} saved job{'s' if len(jobs) != 1 else ''}</p>"
    )
    return _PAGE_WRAP.format(heading=heading, table=table)


def _build_single_html(job: dict) -> str:
    table = _TABLE_HEADER + _job_row(job) + "\n    </tbody>\n  </table>"
    heading = (
        f'<h1 style="color:#6c8ef7;margin-bottom:4px;">JobJames — Job Listing</h1>'
        f'<p style="color:#7a7e9a;margin-bottom:24px;">'
        f"{job['title']} at {job['company']}</p>"
    )
    return _PAGE_WRAP.format(heading=heading, table=table)


async def _send(to: str, subject: str, html: str) -> None:
    if not settings.resend_api_key:
        raise HTTPException(
            status_code=503,
            detail="Email not configured — set RESEND_API_KEY in .env",
        )
    payload = {"from": settings.email_from, "to": [to], "subject": subject, "html": html}
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            RESEND_URL,
            json=payload,
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
        )
    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=502, detail=f"Resend error: {resp.text}")


@router.post("/email")
async def email_saved_jobs(req: EmailRequest):
    jobs = await get_saved_jobs()
    if not jobs:
        raise HTTPException(status_code=400, detail="No saved jobs to send")
    await _send(
        req.to,
        f"JobJames — {len(jobs)} saved listing{'s' if len(jobs) != 1 else ''}",
        _build_bulk_html(jobs),
    )
    return {"sent": len(jobs), "to": req.to}


@router.post("/{job_id}/email")
async def email_single_job(job_id: str, req: EmailRequest):
    job = await get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    await _send(
        req.to,
        f"JobJames — {job['title']} at {job['company']}",
        _build_single_html(job),
    )
    return {"sent": 1, "to": req.to}
