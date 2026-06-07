from fastapi import APIRouter, Depends

from app.api.deps import require_access_code
from app.database import get_all_settings, set_settings
from app.models.settings import SettingsUpdate

router = APIRouter()


@router.get("")
async def get_settings(access_code: str = Depends(require_access_code)) -> dict:
    return await get_all_settings(access_code)


@router.put("")
async def update_settings(
    body: SettingsUpdate,
    access_code: str = Depends(require_access_code),
) -> dict:
    from app.services import scheduler as sched
    pairs = {k: v for k, v in body.model_dump().items() if v is not None}
    result = await set_settings(pairs, access_code)
    if "digest_frequency" in pairs or "digest_time" in pairs:
        all_cfg = await get_all_settings(access_code)
        sched.reschedule_digest(
            all_cfg.get("digest_frequency", "off"),
            all_cfg.get("digest_time", "08:00"),
            access_code,
        )
    return result
