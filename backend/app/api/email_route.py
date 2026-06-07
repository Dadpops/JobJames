from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr

from app.api.deps import require_access_code
from app.database import get_job, get_saved_jobs
from app.services.email_service import send_email

router = APIRouter()


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


_THEAD = """
  <table style="width:100%;border-collapse:collapse;background:#1a1d27;border-radius:8px;overflow:hidden;">
    <thead><tr>
      <th style="padding:10px 8px;text-align:left;color:#7a7e9a;font-size:12px;text-transform:uppercase;">Title</th>
      <th style="padding:10px 8px;text-align:left;color:#7a7e9a;font-size:12px;text-transform:uppercase;">Company</th>
      <th style="padding:10px 8px;text-align:left;color:#7a7e9a;font-size:12px;text-transform:uppercase;">Location</th>
      <th style="padding:10px 8px;text-align:left;color:#7a7e9a;font-size:12px;text-transform:uppercase;">Salary</th>
      <th style="padding:10px 8px;text-align:left;color:#7a7e9a;font-size:12px;text-transform:uppercase;">Source</th>
    </tr></thead><tbody>"""

_WRAP = """<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="background:#0f1117;color:#e2e4f0;font-family:system-ui,sans-serif;padding:32px;">
  {heading}{table}
  <p style="color:#7a7e9a;font-size:12px;margin-top:24px;">Sent by JobJames</p>
</body></html>"""


def _wrap(heading: str, jobs: list[dict]) -> str:
    rows = "".join(_job_row(j) for j in jobs)
    return _WRAP.format(heading=heading, table=_THEAD + rows + "\n    </tbody>\n  </table>")


@router.post("/email")
async def email_saved_jobs(
    req: EmailRequest,
    access_code: str = Depends(require_access_code),
):
    jobs = await get_saved_jobs(access_code)
    if not jobs:
        raise HTTPException(status_code=400, detail="No saved jobs to send")
    heading = (
        f'<h1 style="color:#6c8ef7;margin-bottom:4px;">JobJames — Saved Listings</h1>'
        f'<p style="color:#7a7e9a;margin-bottom:24px;">{len(jobs)} saved job{"s" if len(jobs) != 1 else ""}</p>'
    )
    await send_email(req.to, f"JobJames — {len(jobs)} saved listing{'s' if len(jobs) != 1 else ''}", _wrap(heading, jobs))
    return {"sent": len(jobs), "to": req.to}


@router.post("/{job_id}/email")
async def email_single_job(
    job_id: str,
    req: EmailRequest,
    access_code: str = Depends(require_access_code),
):
    job = await get_job(job_id, access_code)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    heading = (
        f'<h1 style="color:#6c8ef7;margin-bottom:4px;">JobJames — Job Listing</h1>'
        f'<p style="color:#7a7e9a;margin-bottom:24px;">{job["title"]} at {job["company"]}</p>'
    )
    await send_email(req.to, f"JobJames — {job['title']} at {job['company']}", _wrap(heading, [job]))
    return {"sent": 1, "to": req.to}
