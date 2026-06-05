from fastapi import APIRouter

from app.database import get_all_settings, set_settings
from app.models.settings import SettingsUpdate

router = APIRouter()


@router.get("")
async def get_settings() -> dict:
    return await get_all_settings()


@router.put("")
async def update_settings(body: SettingsUpdate) -> dict:
    from app.services import scheduler as sched
    pairs = {k: v for k, v in body.model_dump().items() if v is not None}
    result = await set_settings(pairs)
    # Reschedule digest if frequency or time changed
    if "digest_frequency" in pairs or "digest_time" in pairs:
        all_cfg = await get_all_settings()
        sched.reschedule_digest(
            all_cfg.get("digest_frequency", "off"),
            all_cfg.get("digest_time", "08:00"),
        )
    return result
