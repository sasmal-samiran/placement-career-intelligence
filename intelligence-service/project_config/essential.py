from pathlib import Path
import os
from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parent.parent
ENV_PATH = PROJECT_ROOT/"intelligence-service/.env"

load_dotenv(ENV_PATH)

DB_Path = PROJECT_ROOT / "assessment_data" / "assessment.db"
leetcode_api = os.getenv("LEETCODE_API_BASE_URL")

__all__ = ["PROJECT_ROOT", "DB_Path", "leetcode_api"]

if __name__ == "__main__":
    print(f"PROJECT_ROOT: {PROJECT_ROOT}")
    print(f"DB_Path: {DB_Path}")
