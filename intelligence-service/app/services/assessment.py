import sqlite3
from typing import Literal


ScoreMethod = Literal["mean", "ewma"]


class StudentNotFoundError(Exception):
    pass

class NoAssessmentResultsError(Exception):
    pass


class AptitudeScorer:
    def __init__(self, conn: sqlite3.Connection) -> None:
        self.conn = conn

    def _get_score(self,student_id: str,method: ScoreMethod = "mean",*,alpha: float = 0.5) -> float:
        if method not in ("mean", "ewma"):
            raise ValueError(f"Unsupported score method: {method}")

        if not isinstance(student_id, str) or not student_id.strip():
            raise ValueError("student_id must be a non-empty string")

        if method == "ewma":
            if not 0 < alpha <= 1:
                raise ValueError("alpha must be greater than 0 and at most 1")

        stats = self._get_stats(student_id)

        scores = [float(row["percentage"]) for row in stats if row["percentage"] is not None]
        if not scores:
            raise NoAssessmentResultsError(f"No usable assessment scores for student: {student_id}")

        if method == "mean":
            return self.general_mean(scores)

        return self._get_EWMA_mean(scores, alpha)

    def _get_stats(self, student_id: str) -> list[dict]:
        try:
            student = self.conn.execute(
                "SELECT 1 FROM students WHERE id = ?",
                (student_id,),
            ).fetchone()

        except sqlite3.OperationalError as exc:
            raise RuntimeError("Unable to query the student table.")
        if student is None:
            raise StudentNotFoundError(f"Student not found: {student_id}")

        rows = self.conn.execute(
            """
            SELECT
                a.id AS attempt_id,
                a.assessment_id,
                r.total_score,
                r.max_score,
                r.percentage,
                r.correct_count,
                r.incorrect_count,
                r.unanswered_count,
                r.attempted_count,
                r.accuracy
            FROM attempts AS a
            JOIN attempt_results AS r
                ON a.id = r.attempt_id
            WHERE a.student_id = ?
            ORDER BY a.submitted_at ASC
            """,
            (student_id,),
        ).fetchall()

        if not rows:
            raise NoAssessmentResultsError(f"No assessment results found for student: {student_id}")

        return [dict(row) for row in rows]

    @staticmethod
    def _get_EWMA_mean(scores: list[float],alpha: float = 0.5,) -> float:
        if not scores:
            raise NoAssessmentResultsError("At least one assessment score is required")

        if not 0 < alpha <= 1:
            raise ValueError("alpha must be greater than 0 and at most 1")

        if not all(0 <= score <= 100 for score in scores):
            raise ValueError("Scores must be between 0 and 100")

        score = scores[0]

        for current_score in scores[1:]:
            score = alpha * current_score + (1 - alpha) * score

        return round(score, 2)

    @staticmethod
    def general_mean(scores: list[float]) -> float:
        if not scores:
            raise NoAssessmentResultsError("At least one assessment score is required")

        if not all(0 <= score <= 100 for score in scores):
            raise ValueError("Scores must be between 0 and 100")

        return round(sum(scores) / len(scores), 2)


__all__ = [
    "AptitudeScorer",
    "StudentNotFoundError",
    "NoAssessmentResultsError",
]
