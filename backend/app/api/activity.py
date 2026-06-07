from fastapi import APIRouter, Depends

from app.api.deps import require_access_code
from app.database import get_activity

router = APIRouter()


@router.get("")
async def list_activity(
    limit: int = 30,
    access_code: str = Depends(require_access_code),
):
    return await get_activity(access_code, limit=min(limit, 100))
