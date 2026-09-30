import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(os.path.join(BASE_DIR, ".env"))

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.join(BASE_DIR, ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "Student placement prediction and career guidance engine"

    # Groq LLM Configuration
    GROQ_API_KEY: str
    GROQ_MODEL: str
    GROQ_TEMPERATURE: float = 0.1
    GROQ_MAX_RETRIES: int = 2
    GROQ_TIMEOUT: float = 60.0

settings = Settings()