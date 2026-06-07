from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Allowed CORS origins — add your Railway frontend URL in production
    allowed_origins: list[str] = ["http://localhost:5173", "http://localhost"]

    # LinkedIn crawler credentials (optional)
    linkedin_email: str = ""
    linkedin_password: str = ""

    # Resend API — required for /api/jobs/email endpoint
    resend_api_key: str = ""
    email_from: str = "JobJames <onboarding@resend.dev>"

    # Database connection string.
    # Local dev (default): SQLite file — just run the backend as-is.
    # Production (Railway): set DATABASE_URL to the PostgreSQL connection string
    #   from the Railway Postgres plugin (postgres://user:pass@host:5432/db).
    database_url: str = "jobjames.db"


settings = Settings()
