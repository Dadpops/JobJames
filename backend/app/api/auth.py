import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database import create_user, get_user, get_user_by_email
from app.services.email_service import send_system_email

router = APIRouter()


class RegisterRequest(BaseModel):
    display_name: str = ""
    email: str = ""


class LoginRequest(BaseModel):
    access_code: str
    display_name: str = ""


class RecoverRequest(BaseModel):
    email: str


def _generate_code() -> str:
    raw = uuid.uuid4().hex[:8].upper()
    return f"{raw[:4]}-{raw[4:]}"


def _recovery_html(access_code: str, display_name: str) -> str:
    name = display_name or "there"
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#0f1117;color:#e2e4f0;font-family:system-ui,sans-serif;padding:32px;">
  <div style="max-width:480px;margin:0 auto;">
    <div style="font-size:32px;font-weight:700;color:#6c8ef7;margin-bottom:8px;">JJ</div>
    <h1 style="color:#e2e4f0;font-size:22px;margin:0 0 8px;">Your JobJames access code</h1>
    <p style="color:#7a7e9a;margin:0 0 24px;">Hi {name}, here's the access code for your account:</p>
    <div style="background:#1a1d27;border:1px solid #2a2d3a;border-radius:10px;padding:20px 24px;text-align:center;margin-bottom:24px;">
      <span style="font-family:monospace;font-size:28px;font-weight:700;color:#6c8ef7;letter-spacing:4px;">{access_code}</span>
    </div>
    <p style="color:#7a7e9a;font-size:13px;">Enter this code on the JobJames sign-in screen to access your account.</p>
    <p style="color:#4a4d5a;font-size:12px;margin-top:32px;">If you didn't request this, you can ignore this email.</p>
  </div>
</body>
</html>"""


@router.post("/register")
async def register(body: RegisterRequest):
    access_code = _generate_code()
    email = body.email.strip().lower() if body.email else ""
    await create_user(access_code, body.display_name, email)
    return {"access_code": access_code, "display_name": body.display_name}


@router.post("/login")
async def login(body: LoginRequest):
    code = body.access_code.strip().upper()
    user = await get_user(code)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid access code")
    return {"access_code": code, "display_name": user.get("display_name") or ""}


@router.post("/recover")
async def recover(body: RecoverRequest):
    email = body.email.strip().lower()
    if not email:
        raise HTTPException(status_code=422, detail="Email is required")
    user = await get_user_by_email(email)
    if user:
        html = _recovery_html(user["access_code"], user.get("display_name") or "")
        await send_system_email(email, "Your JobJames access code", html)
    # Always return success to prevent email enumeration
    return {"sent": True}
