
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- 1. assessments
CREATE TABLE IF NOT EXISTS assessments (
    id               TEXT PRIMARY KEY, 
    title            TEXT NOT NULL,
    description      TEXT,
    duration_minutes INTEGER NOT NULL CHECK(duration_minutes > 0),
    total_marks      REAL    NOT NULL CHECK (total_marks >= 0),
    is_active        INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- 2. questions
CREATE TABLE IF NOT EXISTS questions (
    id                     TEXT PRIMARY KEY, 
    -- assessment_id          TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    section                TEXT NOT NULL CHECK (section IN ('quantitative', 'logical', 'verbal')),
    topic                  TEXT NOT NULL,
    difficulty             TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    question_text          TEXT NOT NULL,
    options_json           TEXT NOT NULL CHECK (json_valid(options_json)),
    correct_answer         TEXT NOT NULL,
    base_marks             REAL NOT NULL CHECK (base_marks > 0),
    base_negative_marks    REAL NOT NULL DEFAULT 0 CHECK (base_negative_marks >= 0),
    explanation            TEXT,
    skill_tags_json        TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(skill_tags_json)),
    estimated_time_seconds INTEGER CHECK (estimated_time_seconds IS NULL OR estimated_time_seconds > 0)
);

-- CREATE INDEX IF NOT EXISTS idx_questions_assessment
--     ON questions(assessment_id);

CREATE INDEX IF NOT EXISTS idx_questions_section
    ON questions(section);



-- 3. attempts
CREATE TABLE IF NOT EXISTS attempts (
    id            TEXT PRIMARY KEY,
    student_id    TEXT NOT NULL REFERENCES students(student_id),            
    assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    started_at    TEXT NOT NULL DEFAULT (datetime('now')),
    submitted_at  TEXT,
    status        TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'abandoned'))
);

CREATE INDEX IF NOT EXISTS idx_attempts_student
    ON attempts(student_id);


-- 4. answers
CREATE TABLE IF NOT EXISTS answers (
    id              TEXT PRIMARY KEY,
    attempt_id      TEXT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
    question_id     TEXT NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
    selected_answer TEXT,                       -- NULL => unanswered
    is_correct      INTEGER CHECK (is_correct IS NULL OR is_correct IN (0, 1)),
    marks_awarded   REAL,

    UNIQUE (attempt_id, question_id)            -- prevent duplicate answers
);

-- CREATE INDEX IF NOT EXISTS idx_answers_attempt
--     ON answers(attempt_id);

-- 5. assessment_questions set 
CREATE TABLE IF NOT EXISTS assessment_questions (
    assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    question_id   TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    question_order INTEGER NOT NULL,
    marks REAL NOT NULL,
    negative_marks REAL NOT NULL DEFAULT 0,
    PRIMARY KEY (assessment_id, question_id),
    UNIQUE (assessment_id, question_order)
);

CREATE INDEX IF NOT EXISTS idx_assessment_questions_order
    ON assessment_questions(assessment_id, question_order);

CREATE TABLE IF NOT EXISTS students (
    student_id TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    email      TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS attempt_results(
    attempt_id       TEXT PRIMARY KEY REFERENCES attempts(id) ON DELETE CASCADE,
    total_score      REAL NOT NULL,
    max_score        REAL NOT NULL CHECK (max_score > 0),
    percentage       REAL CHECK (percentage >= 0 AND percentage <= 100),
    correct_count    INTEGER NOT NULL DEFAULT 0,
    incorrect_count  INTEGER NOT NULL DEFAULT 0,
    unanswered_count INTEGER NOT NULL DEFAULT 0,
    attempted_count  INTEGER NOT NULL DEFAULT 0,

    accuracy         REAL NOT NULL DEFAULT 0,
    calculated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);