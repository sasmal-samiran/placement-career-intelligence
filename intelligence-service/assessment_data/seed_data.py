from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SCHEMA_PATH = HERE / "schema.sql"
QUESTIONS_PATH = HERE / "questions.json"
DB_PATH = HERE / "assessment.db"



# Seed data

STUDENTS = [
    ("STU-001", "Aarav Sharma", "student001@example.com", "2025-01-05T09:00:00"),
    ("STU-002", "Priya Nair",   "student002@example.com", "2025-01-05T09:05:00"),
    ("STU-003", "Rohan Verma",  "student003@example.com", "2025-01-05T09:10:00"),
    ("STU-004", "Meera Iyer",   "student004@example.com", "2025-01-05T09:15:00"),
    ("STU-005", "Kabir Khan",   "student005@example.com", "2025-01-05T09:20:00"),
]

# (attempt_id, student_id, assessment_id, started_at, submitted_at, status)
ATTEMPTS = [
    ("ATT-001", "STU-001", "APT-001", "2025-01-10T10:00:00", "2025-01-10T10:24:00", "submitted"),
    ("ATT-002", "STU-001", "APT-002", "2025-01-11T10:00:00", "2025-01-11T10:25:00", "submitted"),
    ("ATT-003", "STU-002", "APT-001", "2025-01-10T11:00:00", "2025-01-10T11:22:00", "submitted"),
    ("ATT-004", "STU-002", "APT-002", "2025-01-11T11:00:00", "2025-01-11T11:21:00", "submitted"),
    ("ATT-005", "STU-003", "APT-001", "2025-01-10T12:00:00", "2025-01-10T12:23:00", "submitted"),
    ("ATT-006", "STU-003", "APT-002", "2025-01-11T12:00:00", "2025-01-11T12:26:00", "submitted"),
    ("ATT-007", "STU-004", "APT-001", "2025-01-10T13:00:00", "2025-01-10T13:24:00", "submitted"),
    ("ATT-008", "STU-004", "APT-002", "2025-01-11T13:00:00", "2025-01-11T13:25:00", "submitted"),
    ("ATT-009", "STU-005", "APT-001", "2025-01-10T14:00:00", "2025-01-10T14:10:00", "abandoned"),
    ("ATT-010", "STU-005", "APT-002", "2025-01-12T14:00:00", None,                   "in_progress"),
]

# Selected answers per question id. None = unanswered. Questions not listed are also treated as unanswered.
# Scenarios: STU-001 weak logical, strong verbal; STU-002 improves on APT-002;
# STU-003 declines on APT-002; STU-004 strong overall.
ANSWER_PATTERNS = {
    "ATT-001": {
        "Q-A-001": "B", "Q-A-002": "A", "Q-A-003": "C", "Q-A-004": "A",
        "Q-A-005": None, "Q-A-006": "B", "Q-A-007": "A", "Q-A-008": "A",
        "Q-A-009": "B", "Q-A-010": "A", "Q-A-011": "B", "Q-A-012": "B",
        "Q-A-013": "B", "Q-A-014": "A", "Q-A-015": "B",
    },
    "ATT-002": {
        "Q-B-001": "B", "Q-B-002": "A", "Q-B-003": "B", "Q-B-004": "B",
        "Q-B-005": "C", "Q-B-006": "C", "Q-B-007": "B", "Q-B-008": "B",
        "Q-B-009": "A", "Q-B-010": "B", "Q-B-011": "B", "Q-B-012": "B",
        "Q-B-013": "B", "Q-B-014": "B", "Q-B-015": "B",
    },
    "ATT-003": {
        "Q-A-001": "B", "Q-A-002": "A", "Q-A-003": "C", "Q-A-004": "C",
        "Q-A-005": "C", "Q-A-006": "B", "Q-A-007": "A", "Q-A-008": "C",
        "Q-A-009": None, "Q-A-010": "B", "Q-A-011": "B", "Q-A-012": "A",
        "Q-A-013": "B", "Q-A-014": None, "Q-A-015": "B",
    },
    "ATT-004": {
        "Q-B-001": "B", "Q-B-002": "D", "Q-B-003": "B", "Q-B-004": "B",
        "Q-B-005": "B", "Q-B-006": "C", "Q-B-007": "D", "Q-B-008": "A",
        "Q-B-009": "B", "Q-B-010": "B", "Q-B-011": "B", "Q-B-012": "A",
        "Q-B-013": "B", "Q-B-014": "B", "Q-B-015": None,
    },
    "ATT-005": {
        "Q-A-001": "B", "Q-A-002": "C", "Q-A-003": "C", "Q-A-004": "C",
        "Q-A-005": "A", "Q-A-006": "B", "Q-A-007": "A", "Q-A-008": "C",
        "Q-A-009": "A", "Q-A-010": "B", "Q-A-011": "B", "Q-A-012": "B",
        "Q-A-013": "B", "Q-A-014": "A", "Q-A-015": "B",
    },
    "ATT-006": {
        "Q-B-001": "B", "Q-B-002": "A", "Q-B-003": "A", "Q-B-004": "B",
        "Q-B-005": "C", "Q-B-006": "C", "Q-B-007": "B", "Q-B-008": "A",
        "Q-B-009": None, "Q-B-010": None, "Q-B-011": "B", "Q-B-012": "B",
        "Q-B-013": "B", "Q-B-014": None, "Q-B-015": "A",
    },
    "ATT-007": {
        "Q-A-001": "B", "Q-A-002": "A", "Q-A-003": "C", "Q-A-004": "C",
        "Q-A-005": None, "Q-A-006": "B", "Q-A-007": "A", "Q-A-008": "C",
        "Q-A-009": "A", "Q-A-010": "B", "Q-A-011": "B", "Q-A-012": "B",
        "Q-A-013": "B", "Q-A-014": "A", "Q-A-015": "A",
    },
    "ATT-008": {
        "Q-B-001": "B", "Q-B-002": "D", "Q-B-003": "B", "Q-B-004": "B",
        "Q-B-005": "B", "Q-B-006": "C", "Q-B-007": "A", "Q-B-008": "A",
        "Q-B-009": "B", "Q-B-010": "B", "Q-B-011": "B", "Q-B-012": "B",
        "Q-B-013": "A", "Q-B-014": "B", "Q-B-015": None,
    },
    # ATT-009 (abandoned) and ATT-010 (in_progress) get no answer rows.
}


# Helpers

def fail(msg: str) -> None:
    print(f"[FAIL] {msg}", file=sys.stderr)
    raise SystemExit(1)

def validate_questions(payload: dict) -> None:
    if "assessments" not in payload or len(payload["assessments"]) < 2:
        fail("questions.json: need at least 2 assessments")

    seen_assessment_ids = set()
    seen_question_ids = set()

    for assessment in payload["assessments"]:
        assessment_id = assessment["id"]
        if assessment_id in seen_assessment_ids:
            fail(f"duplicate assessment id {assessment_id}")
        seen_assessment_ids.add(assessment_id)

        if assessment["duration_minutes"] <= 0:
            fail(f"{assessment_id}: duration_minutes must be > 0")

        total = 0.0
        for question in assessment["questions"]:
            question_id = question["id"]
            if question_id in seen_question_ids:
                fail(f"duplicate question id {question_id}")
            seen_question_ids.add(question_id)

            if question["section"] not in {"quantitative", "logical", "verbal"}:
                fail(f"{question_id}: bad section")
            if question["difficulty"] not in {"easy", "medium", "hard"}:
                fail(f"{question_id}: bad difficulty")
            if set(question["options"].keys()) != {"A", "B", "C", "D"}:
                fail(f"{question_id}: options must be exactly A,B,C,D")
            if question["correct_answer"] not in question["options"]:
                fail(f"{question_id}: correct_answer not in options")
            if not question.get("explanation", "").strip():
                fail(f"{question_id}: explanation required")
            if not question.get("skill_tags"):
                fail(f"{question_id}: skill_tags must be non-empty")
            if question["marks"] <= 0:
                fail(f"{question_id}: marks must be > 0")
            if question["negative_marks"] < 0:
                fail(f"{question_id}: negative_marks must be >= 0")

            total += float(question["marks"])

        if abs(total - float(assessment["total_marks"])) > 1e-9:
            fail(f"{assessment_id}: total_marks does not equal sum of question marks")

# Scoring

def score_attempt(conn: sqlite3.Connection, attempt_id: str) -> None:
    assessment_id = conn.execute("SELECT assessment_id FROM attempts WHERE id = ?", (attempt_id,)).fetchone()[0]

    # Pull marks and correct answers for this assessment, ordered by question.
    rows = conn.execute(
        """
        SELECT aq.question_id, aq.marks, aq.negative_marks, q.correct_answer
        FROM assessment_questions AS aq
        JOIN questions AS q ON q.id = aq.question_id
        WHERE aq.assessment_id = ?
        ORDER BY aq.question_order
        """,
        (assessment_id,),).fetchall()
    if not rows:
        fail(f"no assessment_questions for {assessment_id}")

    meta = {
        qid: {"marks": float(m), "neg": float(nm), "correct": ca}
        for (qid, m, nm, ca) in rows
    }
    max_score = sum(v["marks"] for v in meta.values())

    answers = conn.execute(
        "SELECT id, question_id, selected_answer FROM answers WHERE attempt_id = ?",
        (attempt_id,),
    ).fetchall()
    if len(answers) != len(meta):
        fail(f"{attempt_id}: expected {len(meta)} answers, found {len(answers)}")

    total_score = 0.0
    correct = incorrect = unanswered = 0

    for ans_id, qid, selected in answers:
        info = meta[qid]
        if selected is None:
            is_correct, awarded = None, 0.0
            unanswered += 1
        elif selected == info["correct"]:
            is_correct, awarded = 1, info["marks"]
            total_score += info["marks"]
            correct += 1
        else:
            is_correct, awarded = 0, -info["neg"]
            total_score -= info["neg"]
            incorrect += 1

        conn.execute(
            "UPDATE answers SET is_correct = ?, marks_awarded = ? WHERE id = ?",
            (is_correct, awarded, ans_id),
        )

    attempted = correct + incorrect
    accuracy = (correct / attempted * 100.0) if attempted else 0.0
    raw_pct = (total_score / max_score * 100.0) if max_score else 0.0
    percentage = max(0.0, min(100.0, raw_pct))

    conn.execute(
        """
        INSERT INTO attempt_results (
            attempt_id, total_score, max_score, percentage,
            correct_count, incorrect_count, unanswered_count, attempted_count,
            accuracy, calculated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            attempt_id, total_score, max_score, percentage,
            correct, incorrect, unanswered, attempted, accuracy,
            "2025-02-01T00:00:00",
        ),
    )

# Build
def build_database() -> None:
    if not SCHEMA_PATH.exists():
        fail(f"missing schema: {SCHEMA_PATH}")
    if not QUESTIONS_PATH.exists():
        fail(f"missing questions.json: {QUESTIONS_PATH}")

    payload = json.loads(QUESTIONS_PATH.read_text(encoding="utf-8"))
    validate_questions(payload)

    # Remove DB and WAL/SHM siblings for a clean rebuild.
    for suffix in ("", "-wal", "-shm"):
        p = Path(str(DB_PATH) + suffix)
        if p.exists():
            p.unlink()

    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute("PRAGMA foreign_keys = ON")
        conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))

        with conn:
            # Assessments
            for assessment in payload["assessments"]:
                conn.execute(
                    """INSERT INTO assessments
                       (id, title, description, duration_minutes, total_marks, is_active, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (
                        assessment["id"], assessment["title"], assessment.get("description"),
                        int(assessment["duration_minutes"]), float(assessment["total_marks"]),
                        int(assessment["is_active"]), "2025-01-01T00:00:00",
                    ),
                )

            # Questions and assessment_questions
            for assessment in payload["assessments"]:
                for order, q in enumerate(assessment["questions"], start=1):
                    conn.execute(
                        """INSERT INTO questions
                           (id, section, topic, difficulty, question_text, options_json,
                            correct_answer, base_marks, base_negative_marks, explanation,
                            skill_tags_json, estimated_time_seconds)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        (
                            q["id"], q["section"], q["topic"], q["difficulty"],
                            q["question_text"], json.dumps(q["options"]),
                            q["correct_answer"], float(q["base_marks"]),
                            float(q["base_negative_marks"]), q["explanation"],
                            json.dumps(q["skill_tags"]),
                            int(q["estimated_time_seconds"])
                            if q.get("estimated_time_seconds") else None,
                        ),
                    )
                    conn.execute(
                        """INSERT INTO assessment_questions
                           (assessment_id, question_id, question_order, marks, negative_marks)
                           VALUES (?, ?, ?, ?, ?)""",
                        (assessment["id"], q["id"], order,
                         float(q["marks"]), float(q["negative_marks"])),
                    )

            # Students
            for sid, name, email, created in STUDENTS:
                conn.execute(
                    "INSERT INTO students (student_id, name, email, created_at) "
                    "VALUES (?, ?, ?, ?)",
                    (sid, name, email, created),
                )

            # Attempts
            for aid, sid, asid, started, submitted, status in ATTEMPTS:
                conn.execute(
                    """INSERT INTO attempts
                       (id, student_id, assessment_id, started_at, submitted_at, status)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (aid, sid, asid, started, submitted, status),
                )

            # Answers for submitted attempts (one row per question)
            attempt_assessment = {aid: asid for (aid, _, asid, _, _, _) in ATTEMPTS}
            assessment_question_ids = {
                assessment["id"]: [q["id"] for q in assessment["questions"]]
                for a in payload["assessments"]
            }

            for attempt_id, pattern in ANSWER_PATTERNS.items():
                asid = attempt_assessment[attempt_id]
                qids = assessment_question_ids[asid]
                if set(pattern) != set(qids):
                    fail(f"answer pattern for {attempt_id} does not match its assessment")

                for qid in qids:
                    conn.execute(
                        """INSERT INTO answers
                           (id, attempt_id, question_id, selected_answer, is_correct, marks_awarded)
                           VALUES (?, ?, ?, ?, NULL, NULL)""",
                        (f"{attempt_id}-{qid}", attempt_id, qid, pattern[qid]),
                    )

            # Results for submitted attempts only
            for aid, _, _, _, _, status in ATTEMPTS:
                if status == "submitted":
                    score_attempt(conn, aid)

        validate_database(conn)
        print_report(conn)
    finally:
        conn.close()

# Post-build validation
def validate_database(conn: sqlite3.Connection) -> None:
    if conn.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
        fail("PRAGMA integrity_check failed")
    if conn.execute("PRAGMA foreign_key_check").fetchall():
        fail("PRAGMA foreign_key_check failed")

    # Every answer's question must belong to its attempt's assessment.
    bad = conn.execute(
        """
        SELECT ans.id FROM answers AS ans
        JOIN attempts AS att ON att.id = ans.attempt_id
        LEFT JOIN assessment_questions AS aq
               ON aq.assessment_id = att.assessment_id
              AND aq.question_id   = ans.question_id
        WHERE aq.question_id IS NULL
        """
    ).fetchall()
    if bad:
        fail(f"answers not mapped to their attempt's assessment: {bad}")

    # Submitted attempts must have exactly one result row.
    bad = conn.execute(
        """
        SELECT a.id FROM attempts AS a
        LEFT JOIN attempt_results AS r ON r.attempt_id = a.id
        WHERE a.status = 'submitted'
        GROUP BY a.id
        HAVING COUNT(r.attempt_id) <> 1
        """
    ).fetchall()
    if bad:
        fail(f"submitted attempts without exactly one result: {bad}")

    # Non-submitted attempts must have no result rows.
    bad = conn.execute(
        """
        SELECT a.id FROM attempts AS a
        JOIN attempt_results AS r ON r.attempt_id = a.id
        WHERE a.status IN ('in_progress', 'abandoned')
        """
    ).fetchall()
    if bad:
        fail(f"non-submitted attempts have results: {bad}")

    # Stored results must match an independent recomputation.
    for (attempt_id,) in conn.execute("SELECT attempt_id FROM attempt_results"):
        recalc = recompute_result(conn, attempt_id)
        stored = conn.execute(
            """SELECT total_score, max_score, percentage,
                      correct_count, incorrect_count, unanswered_count,
                      attempted_count, accuracy
               FROM attempt_results WHERE attempt_id = ?""",
            (attempt_id,),
        ).fetchone()

        keys = ("total_score", "max_score", "percentage", "correct_count",
                "incorrect_count", "unanswered_count", "attempted_count", "accuracy")
        for key, stored_value in zip(keys, stored):
            recalc_value = recalc[key]
            if isinstance(stored_value, float):
                if abs(stored_value - recalc_value) > 1e-6:
                    fail(f"mismatch on {attempt_id}.{key}")
            elif int(stored_value) != int(recalc_value):
                fail(f"mismatch on {attempt_id}.{key}")


def recompute_result(conn: sqlite3.Connection, attempt_id: str) -> dict:
    """Independently recalculate a result from the persisted answers."""
    assessment_id = conn.execute(
        "SELECT assessment_id FROM attempts WHERE id = ?", (attempt_id,)
    ).fetchone()[0]

    max_score = conn.execute(
        "SELECT SUM(marks) FROM assessment_questions WHERE assessment_id = ?",
        (assessment_id,),
    ).fetchone()[0] or 0.0

    rows = conn.execute(
        """
        SELECT ans.selected_answer, aq.marks, aq.negative_marks, q.correct_answer
        FROM answers AS ans
        JOIN assessment_questions AS aq
              ON aq.assessment_id = ? AND aq.question_id = ans.question_id
        JOIN questions AS q ON q.id = ans.question_id
        WHERE ans.attempt_id = ?
        """,
        (assessment_id, attempt_id),
    ).fetchall()

    total_score = 0.0
    correct = incorrect = unanswered = 0
    for selected, marks, neg, correct_ans in rows:
        if selected is None:
            unanswered += 1
        elif selected == correct_ans:
            correct += 1
            total_score += float(marks)
        else:
            incorrect += 1
            total_score -= float(neg)

    attempted = correct + incorrect
    accuracy = (correct / attempted * 100.0) if attempted else 0.0
    raw_pct = (total_score / max_score * 100.0) if max_score else 0.0
    percentage = max(0.0, min(100.0, raw_pct))

    return {
        "total_score": total_score,
        "max_score": float(max_score),
        "percentage": percentage,
        "correct_count": correct,
        "incorrect_count": incorrect,
        "unanswered_count": unanswered,
        "attempted_count": attempted,
        "accuracy": accuracy,
    }

# Report
def print_report(conn: sqlite3.Connection) -> None:
    print(f"Database path: {DB_PATH}")
    print(f"Students: {conn.execute('SELECT COUNT(*) FROM students').fetchone()[0]}")
    print(f"Assessments: {conn.execute('SELECT COUNT(*) FROM assessments').fetchone()[0]}")
    print(f"Unique questions: {conn.execute('SELECT COUNT(*) FROM questions').fetchone()[0]}")
    print(
        "Assessment-question mappings: "
        f"{conn.execute('SELECT COUNT(*) FROM assessment_questions').fetchone()[0]}"
    )

    print("Attempts by status:")
    for status, count in conn.execute(
        "SELECT status, COUNT(*) FROM attempts GROUP BY status ORDER BY status"
    ):
        print(f"  {status}: {count}")

    print(
        "Submitted results: "
        f"{conn.execute('SELECT COUNT(*) FROM attempt_results').fetchone()[0]}"
    )

    print("Per-student mean assessment percentage (submitted only):")
    rows = conn.execute(
        """
        SELECT s.student_id, s.name,
               COUNT(r.attempt_id) AS completed,
               ROUND(AVG(r.percentage), 2) AS mean_pct
        FROM students AS s
        LEFT JOIN attempts AS a ON a.student_id = s.student_id AND a.status = 'submitted'
        LEFT JOIN attempt_results AS r ON r.attempt_id = a.id
        GROUP BY s.student_id, s.name
        ORDER BY s.student_id
        """
    ).fetchall()
    for sid, name, completed, mean_pct in rows:
        mean_display = f"{mean_pct:.2f}" if mean_pct is not None else "n/a"
        print(f"  {sid}  {name:<14}  completed={completed}  mean={mean_display}")


if __name__ == "__main__":
    build_database()