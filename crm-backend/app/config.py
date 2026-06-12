"""Application settings, loaded from environment / .env."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/brewhaus"
    channel_service_url: str = "http://localhost:8001"
    crm_public_url: str = "http://localhost:8000"

    ai_provider: str = "gemini"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash-lite"

    # Optional fallback provider — used automatically if the primary is rate-limited
    # or unavailable. Groq's free tier is fast and generous (great for dev/demo).
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"


settings = Settings()
