import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database import create_user, get_user

router = APIRouter()


class RegisterRequest(BaseModel):
    display_name: str = ""


class LoginRequest(BaseModel):
    access_code: str
    display_name: str = ""


def _generate_code() -> str:
    raw = uuid.uuid4().hex[:8].upper()
    return f"{raw[:4]}-{raw[4:]}"


@router.post("/register")
async def register(body: RegisterRequest):
    access_code = _generate_code()
    await create_user(access_code, body.display_name)
    return {"access_code": access_code, "display_name": body.display_name}


@router.post("/login")
async def login(body: LoginRequest):
    code = body.access_code.strip().upper()
    user = await get_user(code)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid access code")
    return {"access_code": code, "display_name": user.get("display_name") or ""}
