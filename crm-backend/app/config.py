"""Application settings, loaded from environment / .env."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/brewhaus"
    channel_service_url: str = "http://localhost:8001"
    crm_public_url: str = "http://localhost:8000"
    # Shared secret to verify signed callbacks from the channel service.
    webhook_secret: str = "brewhaus-demo-webhook-secret"

    ai_provider: str = "gemini"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash-lite"

    # Optional fallback provider — used automatically if the primary is rate-limited
    # or unavailable. Groq's free tier is fast and generous (great for dev/demo).
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    # Image generation (rich-media messages). Hugging Face = real gen, reliable.
    # Free token at https://huggingface.co/settings/tokens. Falls back to a
    # best-effort no-key service if unset.
    hf_token: str = ""
    hf_image_model: str = "black-forest-labs/FLUX.1-schnell"


settings = Settings()
