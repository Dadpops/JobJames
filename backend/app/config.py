from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    cors_origins: list[str] = ["http://localhost:5173"]
    linkedin_email: str = ""
    linkedin_password: str = ""


settings = Settings()
