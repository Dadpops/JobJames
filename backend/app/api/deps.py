from fastapi import Header, HTTPException


async def require_access_code(x_access_code: str | None = Header(default=None)) -> str:
    if not x_access_code:
        raise HTTPException(status_code=401, detail="Missing X-Access-Code header")
    return x_access_code
