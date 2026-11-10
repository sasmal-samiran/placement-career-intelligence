import os
from pathlib import Path
from pydantic import Field, model_validator
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

    DUPLICATE_THRESHOLD: float = Field(default=85.0, ge=0, le=100)
    DUPLICATE_REVIEW_THRESHOLD: float = Field(default=70.0, ge=0, le=100)
    DUPLICATE_PROJECT_TITLE_WEIGHT: float = Field(default=0.35, ge=0)
    DUPLICATE_PROJECT_DESCRIPTION_WEIGHT: float = Field(default=0.40, ge=0)
    DUPLICATE_PROJECT_TECHNOLOGIES_WEIGHT: float = Field(default=0.25, ge=0)
    DUPLICATE_CERTIFICATION_NAME_WEIGHT: float = Field(default=0.35, ge=0)
    DUPLICATE_CERTIFICATION_ISSUER_WEIGHT: float = Field(default=0.30, ge=0)
    DUPLICATE_CERTIFICATION_ISSUE_DATE_WEIGHT: float = Field(default=0.20, ge=0)
    DUPLICATE_CERTIFICATION_YEAR_WEIGHT: float = Field(default=0.15, ge=0)
    DUPLICATE_ACHIEVEMENT_TITLE_WEIGHT: float = Field(default=0.475, ge=0)
    DUPLICATE_ACHIEVEMENT_DESCRIPTION_WEIGHT: float = Field(default=0.475, ge=0)
    DUPLICATE_ACHIEVEMENT_YEAR_WEIGHT: float = Field(default=0.05, ge=0)
    DUPLICATE_INTERNSHIP_COMPANY_WEIGHT: float = Field(default=0.30, ge=0)
    DUPLICATE_INTERNSHIP_ROLE_WEIGHT: float = Field(default=0.30, ge=0)
    DUPLICATE_INTERNSHIP_DESCRIPTION_WEIGHT: float = Field(default=0.35, ge=0)
    DUPLICATE_INTERNSHIP_START_DATE_WEIGHT: float = Field(default=0.025, ge=0)
    DUPLICATE_INTERNSHIP_END_DATE_WEIGHT: float = Field(default=0.025, ge=0)

    @model_validator(mode="after")
    def validate_duplicate_settings(self):
        if self.DUPLICATE_REVIEW_THRESHOLD >= self.DUPLICATE_THRESHOLD:
            raise ValueError("DUPLICATE_REVIEW_THRESHOLD must be below DUPLICATE_THRESHOLD")

        weight_groups = (
            (
                self.DUPLICATE_PROJECT_TITLE_WEIGHT,
                self.DUPLICATE_PROJECT_DESCRIPTION_WEIGHT,
                self.DUPLICATE_PROJECT_TECHNOLOGIES_WEIGHT,
            ),
            (
                self.DUPLICATE_CERTIFICATION_NAME_WEIGHT,
                self.DUPLICATE_CERTIFICATION_ISSUER_WEIGHT,
                self.DUPLICATE_CERTIFICATION_ISSUE_DATE_WEIGHT,
                self.DUPLICATE_CERTIFICATION_YEAR_WEIGHT,
            ),
            (
                self.DUPLICATE_ACHIEVEMENT_TITLE_WEIGHT,
                self.DUPLICATE_ACHIEVEMENT_DESCRIPTION_WEIGHT,
                self.DUPLICATE_ACHIEVEMENT_YEAR_WEIGHT,
            ),
            (
                self.DUPLICATE_INTERNSHIP_COMPANY_WEIGHT,
                self.DUPLICATE_INTERNSHIP_ROLE_WEIGHT,
                self.DUPLICATE_INTERNSHIP_DESCRIPTION_WEIGHT,
                self.DUPLICATE_INTERNSHIP_START_DATE_WEIGHT,
                self.DUPLICATE_INTERNSHIP_END_DATE_WEIGHT,
            ),
        )
        if any(sum(weights) == 0 for weights in weight_groups):
            raise ValueError("Each duplicate category must have at least one positive weight")
        return self

settings = Settings()