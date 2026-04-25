from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./renalwatch.db"
    SECRET_KEY: str = "change_me_to_a_strong_secret_key"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    MODEL_PATH: str = "app/ml/saved_model.pkl"

    BREVO_API_KEY: str | None = None
    MAIL_SENDER_EMAIL: str | None = None
    MAIL_SENDER_NAME: str | None = "CKD Guardian"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()