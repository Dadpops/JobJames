from __future__ import annotations
from typing import Optional
from pydantic import BaseModel


class SettingsUpdate(BaseModel):
    digest_to: Optional[str] = None
    digest_frequency: Optional[str] = None   # daily | weekly | off
    digest_time: Optional[str] = None        # HH:MM
    smtp_host: Optional[str] = None
    smtp_port: Optional[str] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from: Optional[str] = None
    smtp_tls: Optional[str] = None           # "true" | "false"
