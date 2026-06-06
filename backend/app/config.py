from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Allowed CORS origins — add your Railway frontend URL in production
    # Example: ALLOWED_ORIGINS=["https://jobjames.up.railway.app","http://localhost:5173"]
    allowed_origins: list[str] = ["http://localhost:5173", "http://localhost"]

    # LinkedIn crawler credentials (optional — enables LinkedIn search results)
    linkedin_email: str = ""
    linkedin_password: str = ""

    # Resend API — required for /api/jobs/email endpoint
    resend_api_key: str = ""
    email_from: str = "JobJames <onboarding@resend.dev>"

    # Database path or sqlite:/// URI.
    # Set DATABASE_URL=/data/jobjames.db with a Railway volume mounted at /data.
    # PostgreSQL migration (Phase 5) will require replacing aiosqlite with SQLAlchemy async.
    database_url: str = "jobjames.db"


settings = Settings()
