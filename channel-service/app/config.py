"""Channel-service settings — the simulation knobs."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    failure_rate: float = 0.10
    open_rate: float = 0.55          # P(engagement) given delivered (open/read stage)
    click_rate: float = 0.20
    min_delay_ms: int = 500
    max_delay_ms: int = 8000
    callback_max_retries: int = 3
    # Shared secret for signing callbacks (CRM verifies). Must match the CRM's.
    webhook_secret: str = "brewhaus-demo-webhook-secret"
    # Fraction of callbacks that are permanently LOST (never delivered, no retry).
    # The channel still records the truth, so CRM reconciliation can recover them.
    callback_drop_rate: float = 0.08


settings = Settings()
