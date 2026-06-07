"""Unified email sender — uses SMTP if configured, else Resend API."""
import email.mime.multipart
import email.mime.text

import aiosmtplib
import httpx
from fastapi import HTTPException

from app.config import settings
from app.database import get_setting

RESEND_URL = "https://api.resend.com/emails"


async def send_email(to: str, subject: str, html: str, access_code: str = "") -> None:
    smtp_host = await get_setting("smtp_host", access_code) if access_code else None
    if smtp_host:
        await _send_smtp(to, subject, html, smtp_host)
    else:
        await _send_resend(to, subject, html)


async def send_system_email(to: str, subject: str, html: str) -> None:
    """Send a system-level email (e.g. access code recovery) via Resend. Silently skips if unconfigured."""
    if not settings.resend_api_key:
        return
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            await client.post(
                RESEND_URL,
                json={"from": settings.email_from, "to": [to], "subject": subject, "html": html},
                headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            )
    except Exception:
        pass


async def _send_smtp(to: str, subject: str, html: str, smtp_host: str) -> None:
    port = int(await get_setting("smtp_port") or "587")
    username = await get_setting("smtp_username") or ""
    password = await get_setting("smtp_password") or ""
    from_addr = await get_setting("smtp_from") or username
    use_tls = (await get_setting("smtp_tls") or "true").lower() == "true"

    msg = email.mime.multipart.MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to
    msg.attach(email.mime.text.MIMEText(html, "html"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=smtp_host,
            port=port,
            username=username or None,
            password=password or None,
            use_tls=use_tls,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"SMTP error: {exc}") from exc


async def _send_resend(to: str, subject: str, html: str) -> None:
    if not settings.resend_api_key:
        raise HTTPException(
            status_code=503,
            detail="Email not configured — set RESEND_API_KEY or SMTP settings",
        )
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            RESEND_URL,
            json={"from": settings.email_from, "to": [to], "subject": subject, "html": html},
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
        )
    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=502, detail=f"Resend error: {resp.text}")
