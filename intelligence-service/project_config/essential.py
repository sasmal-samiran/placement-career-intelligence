from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent

DB_Path = PROJECT_ROOT / "assessment_data" / "assessment.db"

__all__ = ["PROJECT_ROOT", "DB_Path"]

if __name__ == "__main__":
    print(f"PROJECT_ROOT: {PROJECT_ROOT}")
    print(f"DB_Path: {DB_Path}")
