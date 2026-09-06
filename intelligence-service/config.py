import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

BASE_DIR = Path("__file__").resolve().parent
load_dotenv(os.path.join(BASE_DIR, ".env"))

class Settings(BaseSettings):
    model_config= SettingsConfigDict(
        env_file= os.path.join(BASE_DIR, ".env"),
        env_file_encoding= "utf-8",
        extra="ignore"
    )

    APP_NAME: str = "Student placement prediction and career guidance engine"

settings = Settings()