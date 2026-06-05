import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from app.config import settings
from app.database import get_saved_jobs

router = APIRouter()


class EmailRequest(BaseModel):
    to: EmailStr


def _build_html(jobs: list[dict]) -> str:
    rows = ""
    for j in jobs:
        salary = ""
        if j.get("salary_min") and j.get("salary_max"):
            salary = f"${j['salary_min']:,} – ${j['salary_max']:,}"
        elif j.get("salary_min"):
            salary = f"${j['salary_min']:,}+"
        rows += f"""
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #2a2d3a;">
            <a href="{j['url']}" style="color:#6c8ef7;font-weight:600;text-decoration:none;">{j['title']}</a>
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #2a2d3a;color:#e2e4f0;">{j['company']}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #2a2d3a;color:#7a7e9a;">{j.get('location') or '—'}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #2a2d3a;color:#4caf82;">{salary or '—'}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #2a2d3a;color:#7a7e9a;text-transform:capitalize;">{j['source']}</td>
        </tr>"""

    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#0f1117;color:#e2e4f0;font-family:system-ui,sans-serif;padding:32px;">
  <h1 style="color:#6c8ef7;margin-bottom:4px;">JobJames — Saved Listings</h1>
  <p style="color:#7a7e9a;margin-bottom:24px;">{len(jobs)} saved job{'s' if len(jobs) != 1 else ''}</p>
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
    <tbody>{rows}</tbody>
  </table>
  <p style="color:#7a7e9a;font-size:12px;margin-top:24px;">Sent by JobJames</p>
</body>
</html>"""


@router.post("/email")
async def email_saved_jobs(req: EmailRequest):
    if not settings.email_smtp_user or not settings.email_smtp_password:
        raise HTTPException(
            status_code=503,
            detail="Email not configured — set EMAIL_SMTP_USER and EMAIL_SMTP_PASSWORD in .env",
        )

    jobs = await get_saved_jobs()
    if not jobs:
        raise HTTPException(status_code=400, detail="No saved jobs to send")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"JobJames — {len(jobs)} saved listing{'s' if len(jobs) != 1 else ''}"
    msg["From"] = settings.email_smtp_user
    msg["To"] = req.to

    plain = "\n".join(
        f"{j['title']} @ {j['company']} — {j['url']}" for j in jobs
    )
    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(_build_html(jobs), "html"))

    try:
        ctx = ssl.create_default_context()
        with smtplib.SMTP(settings.email_smtp_host, settings.email_smtp_port) as smtp:
            smtp.ehlo()
            smtp.starttls(context=ctx)
            smtp.login(settings.email_smtp_user, settings.email_smtp_password)
            smtp.sendmail(settings.email_smtp_user, req.to, msg.as_string())
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"SMTP error: {exc}")

    return {"sent": len(jobs), "to": req.to}
