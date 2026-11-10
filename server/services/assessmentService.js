const mongoose = require("mongoose");
const Assessment = require("../models/Assessment");
const AssessmentLevel = require("../models/AssessmentLevel");
const QuestionBank = require("../models/QuestionBank");
const AssessmentSession = require("../models/AssessmentSession");
const QuestionAttemptHistory = require("../models/QuestionAttemptHistory");
const AssessmentAttempt = require("../models/AssessmentAttempt");
const Student = require("../models/Student");

class AssessmentService {
    /**
     * Get all active assessment tracks and difficulty levels
     */
    async getCatalog() {
        const [assessments, levels] = await Promise.all([
            Assessment.find({ isActive: true }).sort({ order: 1 }).lean(),
            AssessmentLevel.find({ isActive: true }).sort({ order: 1 }).lean(),
        ]);
        return { assessments, levels };
    }

    /**
     * Check and return any currently active in-progress session for a student
     */
    async getActiveSession(studentId) {
        const session = await AssessmentSession.findOne({
            student: studentId,
            status: "IN_PROGRESS",
        }).lean();

        if (!session) {
            return { hasActive: false, session: null };
        }

        const now = new Date();
        const expiresAt = new Date(session.expiresAt);

        // Check if session has expired past grace period (5 seconds)
        if (now.getTime() > expiresAt.getTime() + 5000) {
            // Auto-finalize expired session
            const finalized = await this.finalizeExpiredSession(session._id, studentId);
            return {
                hasActive: false,
                session: null,
                expiredSession: finalized,
                message: "Your previous session timed out and was automatically finalized.",
            };
        }

        const remainingSeconds = Math.max(
            0,
            Math.floor((expiresAt.getTime() - now.getTime()) / 1000)
        );

        // Build answer map from recorded responses
        const answersMap = {};
        const reviewMap = {};
        if (session.responses && Array.isArray(session.responses)) {
            session.responses.forEach((r) => {
                const qIdStr = r.questionId.toString();
                if (r.selectedOptionId) {
                    answersMap[qIdStr] = r.selectedOptionId;
                }
                if (r.isMarkedForReview) {
                    reviewMap[qIdStr] = true;
                }
            });
        }

        return {
            hasActive: true,
            session: {
                _id: session._id,
                assessmentSlug: session.assessmentSlug,
                assessmentTitle: session.assessmentTitle,
                level: session.level,
                durationMinutes: session.durationMinutes,
                startTime: session.startTime,
                expiresAt: session.expiresAt,
                remainingSeconds,
                questions: session.questions,
                savedAnswers: answersMap,
                markedForReview: reviewMap,
            },
        };
    }

    /**
     * Start a new assessment session with progressive difficulty & repetition prevention
     */
    async startSession(studentId, { assessmentSlug, levelSlug }) {
        if (!assessmentSlug) {
            throw new Error("Assessment track is required");
        }
        const effectiveLevelSlug = levelSlug || "intermediate";

        // 1. Verify student exists
        const student = await Student.findById(studentId);
        if (!student) {
            throw new Error("Student record not found");
        }

        // 2. Check for existing active session
        const existingSession = await AssessmentSession.findOne({
            student: studentId,
            status: "IN_PROGRESS",
        });

        if (existingSession) {
            const now = new Date();
            if (now.getTime() < new Date(existingSession.expiresAt).getTime() + 5000) {
                const remaining = Math.max(
                    0,
                    Math.floor((new Date(existingSession.expiresAt).getTime() - now.getTime()) / 1000)
                );
                const error = new Error(
                    "You already have an active assessment session in progress. Please complete or submit it."
                );
                error.statusCode = 409;
                error.activeSessionId = existingSession._id;
                error.remainingSeconds = remaining;
                throw error;
            } else {
                // Expired: auto-finalize before starting fresh
                await this.finalizeExpiredSession(existingSession._id, studentId);
            }
        }

        // 3. Retrieve Assessment and Level metadata
        const assessment = await Assessment.findOne({
            slug: assessmentSlug,
            isActive: true,
        }).lean();

        if (!assessment) {
            throw new Error(`Assessment track '${assessmentSlug}' not found or inactive`);
        }

        const level = await AssessmentLevel.findOne({
            slug: effectiveLevelSlug,
            isActive: true,
        }).lean();

        if (!level) {
            throw new Error(`Assessment level '${effectiveLevelSlug}' not found or inactive`);
        }

        // 4. Repetition Prevention: Fetch previously attempted question IDs for this student
        const historyRecords = await QuestionAttemptHistory.find({
            student: studentId,
        })
            .select("question attemptedAt")
            .sort({ attemptedAt: -1 })
            .lean();

        const attemptedQuestionIds = historyRecords.map((h) => h.question.toString());
        const attemptedSet = new Set(attemptedQuestionIds);

        // 5. Progressive Difficulty Question Selection
        const totalNeeded = level.totalQuestions || 10;
        const distribution = level.difficultyDistribution || {
            easy: 20,
            medium: 60,
            hard: 20,
            expert: 0,
        };

        // Determine category filter
        const categoryFilter =
            assessment.category === "diagnostic" ? {} : { category: assessment.category };

        // Calculate count for each difficulty
        const difficulties = ["easy", "medium", "hard", "expert"];
        const countsByDiff = {};
        let allocated = 0;

        difficulties.forEach((diff) => {
            const pct = distribution[diff] || 0;
            const cnt = Math.round((pct / 100) * totalNeeded);
            countsByDiff[diff] = cnt;
            allocated += cnt;
        });

        // Balance rounding discrepancy
        if (allocated < totalNeeded) {
            countsByDiff["medium"] = (countsByDiff["medium"] || 0) + (totalNeeded - allocated);
        } else if (allocated > totalNeeded) {
            const diffToRemove = countsByDiff["easy"] > 0 ? "easy" : "medium";
            countsByDiff[diffToRemove] -= (allocated - totalNeeded);
        }

        const selectedQuestions = [];
        const chosenQuestionIds = new Set();

        for (const diff of difficulties) {
            const targetCount = countsByDiff[diff] || 0;
            if (targetCount <= 0) continue;

            // Step A: Select questions user has NOT attempted yet
            const freshFilter = {
                ...categoryFilter,
                difficulty: diff,
                isActive: true,
                _id: { $nin: Array.from(attemptedSet) },
            };

            const freshQuestions = await QuestionBank.find(freshFilter)
                .select("_id question_text category subtopic difficulty options marks")
                .limit(targetCount)
                .lean();

            freshQuestions.forEach((q) => {
                if (!chosenQuestionIds.has(q._id.toString())) {
                    chosenQuestionIds.add(q._id.toString());
                    selectedQuestions.push(q);
                }
            });

            // Step B: Intelligent Fallback if insufficient unseen questions exist
            const shortage = targetCount - freshQuestions.length;
            if (shortage > 0) {
                const fallbackFilter = {
                    ...categoryFilter,
                    difficulty: diff,
                    isActive: true,
                    _id: { $nin: Array.from(chosenQuestionIds) },
                };

                const fallbackQuestions = await QuestionBank.find(fallbackFilter)
                    .select("_id question_text category subtopic difficulty options marks")
                    .limit(shortage)
                    .lean();

                fallbackQuestions.forEach((q) => {
                    if (!chosenQuestionIds.has(q._id.toString())) {
                        chosenQuestionIds.add(q._id.toString());
                        selectedQuestions.push(q);
                    }
                });
            }
        }

        // If overall selected count is still below totalNeeded, backfill from any available in category
        if (selectedQuestions.length < totalNeeded) {
            const extraFilter = {
                ...categoryFilter,
                isActive: true,
                _id: { $nin: Array.from(chosenQuestionIds) },
            };
            const extra = await QuestionBank.find(extraFilter)
                .select("_id question_text category subtopic difficulty options marks")
                .limit(totalNeeded - selectedQuestions.length)
                .lean();

            extra.forEach((q) => {
                chosenQuestionIds.add(q._id.toString());
                selectedQuestions.push(q);
            });
        }

        if (selectedQuestions.length === 0) {
            throw new Error("No questions currently available in the database for this track.");
        }

        // Shuffle questions for varied order
        for (let i = selectedQuestions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [selectedQuestions[i], selectedQuestions[j]] = [selectedQuestions[j], selectedQuestions[i]];
        }

        // Prepare question snapshots for session (omitting correct answers and explanations)
        const sessionQuestions = selectedQuestions.map((q) => ({
            questionId: q._id,
            question_text: q.question_text,
            category: q.category,
            subtopic: q.subtopic,
            difficulty: q.difficulty,
            options: q.options.map((opt) => ({
                option_id: opt.option_id,
                text: opt.text,
            })),
            marks: q.marks || 1,
        }));

        // 6. Authoritative Timer: Start time and Expiry time
        const durationMinutes = level.durationMinutes || 15;
        const startTime = new Date();
        const expiresAt = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

        const newSession = new AssessmentSession({
            student: studentId,
            assessment: assessment._id,
            assessmentSlug: assessment.slug,
            assessmentTitle: assessment.title,
            level: level.slug,
            durationMinutes,
            startTime,
            expiresAt,
            status: "IN_PROGRESS",
            questions: sessionQuestions,
            responses: [],
        });

        await newSession.save();

        return {
            sessionId: newSession._id,
            assessmentSlug: assessment.slug,
            assessmentTitle: assessment.title,
            level: level.slug,
            durationMinutes,
            startTime,
            expiresAt,
            remainingSeconds: durationMinutes * 60,
            totalQuestions: sessionQuestions.length,
            questions: sessionQuestions,
        };
    }

    /**
     * Save draft answer or review flag in real time
     */
    async saveDraft(studentId, { sessionId, questionId, selectedOptionId, isMarkedForReview }) {
        if (!sessionId || !questionId) {
            throw new Error("Session ID and Question ID are required");
        }

        const session = await AssessmentSession.findOne({
            _id: sessionId,
            student: studentId,
            status: "IN_PROGRESS",
        });

        if (!session) {
            throw new Error("Active session not found or already closed");
        }

        const now = new Date();
        if (now.getTime() > new Date(session.expiresAt).getTime() + 10000) {
            throw new Error("Assessment time has expired");
        }

        const qIdStr = questionId.toString();
        let existingResp = session.responses.find(
            (r) => r.questionId.toString() === qIdStr
        );

        if (existingResp) {
            if (selectedOptionId !== undefined) {
                existingResp.selectedOptionId = selectedOptionId;
            }
            if (isMarkedForReview !== undefined) {
                existingResp.isMarkedForReview = isMarkedForReview;
            }
            existingResp.answeredAt = new Date();
        } else {
            session.responses.push({
                questionId,
                selectedOptionId: selectedOptionId || "",
                isMarkedForReview: isMarkedForReview || false,
                answeredAt: new Date(),
            });
        }

        await session.save();

        const answeredCount = session.responses.filter((r) => r.selectedOptionId).length;
        return { success: true, answeredCount };
    }

    /**
     * Submit and grade assessment session
     */
    async submitSession(studentId, { sessionId, answers, isAutoSubmitted }) {
        if (!sessionId) {
            throw new Error("Session ID is required for submission");
        }

        const session = await AssessmentSession.findOne({
            _id: sessionId,
            student: studentId,
        });

        if (!session) {
            throw new Error("Assessment session not found");
        }

        // Idempotency: If already completed or expired, return existing result without re-grading
        if (session.status === "COMPLETED" || session.status === "EXPIRED") {
            return this.formatSubmissionResult(session);
        }

        if (session.status !== "IN_PROGRESS") {
            throw new Error(`Cannot submit session in '${session.status}' state`);
        }

        const now = new Date();
        const expiresAt = new Date(session.expiresAt);
        const isTimeExpired = now.getTime() > expiresAt.getTime() + 15000; // 15s network latency buffer

        // Merge submitted answers into responses
        if (Array.isArray(answers) && answers.length > 0) {
            const answerMap = {};
            answers.forEach((a) => {
                if (a.questionId) {
                    answerMap[a.questionId.toString()] = a.selectedOptionId || "";
                }
            });

            session.questions.forEach((q) => {
                const qIdStr = q.questionId.toString();
                let resp = session.responses.find((r) => r.questionId.toString() === qIdStr);
                const selected = answerMap[qIdStr];
                if (resp) {
                    if (selected !== undefined) resp.selectedOptionId = selected;
                } else if (selected) {
                    session.responses.push({
                        questionId: q.questionId,
                        selectedOptionId: selected,
                        answeredAt: now,
                    });
                }
            });
        }

        // Fetch question bank records with correct answers and explanations for grading
        const questionIds = session.questions.map((q) => q.questionId);
        const originalQuestions = await QuestionBank.find({
            _id: { $in: questionIds },
        })
            .select("+correct_option_id +explanation")
            .lean();

        const origMap = {};
        originalQuestions.forEach((oq) => {
            origMap[oq._id.toString()] = oq;
        });

        // Grading logic
        let totalScore = 0;
        let totalMarks = 0;
        let correctCount = 0;
        let incorrectCount = 0;
        let unansweredCount = 0;
        const categoryStats = {};
        const historyDocs = [];
        const questionReviews = [];

        session.questions.forEach((sq) => {
            const qIdStr = sq.questionId.toString();
            const orig = origMap[qIdStr] || {};
            const qMarks = sq.marks || orig.marks || 1;
            totalMarks += qMarks;

            const userResp = session.responses.find(
                (r) => r.questionId.toString() === qIdStr
            );
            const selectedOpt = userResp ? userResp.selectedOptionId : "";
            const isCorrect = selectedOpt && selectedOpt === orig.correct_option_id;

            if (!selectedOpt) {
                unansweredCount++;
            } else if (isCorrect) {
                correctCount++;
                totalScore += qMarks;
            } else {
                incorrectCount++;
            }

            // Category breakdown stats
            const cat = sq.category || orig.category || "general";
            if (!categoryStats[cat]) {
                categoryStats[cat] = {
                    total: 0,
                    correct: 0,
                    score: 0,
                    maxScore: 0,
                    subtopics: {},
                };
            }
            categoryStats[cat].total++;
            categoryStats[cat].maxScore += qMarks;
            if (isCorrect) {
                categoryStats[cat].correct++;
                categoryStats[cat].score += qMarks;
            }

            // Subtopic stats
            const sub = sq.subtopic || orig.subtopic || "General";
            if (!categoryStats[cat].subtopics[sub]) {
                categoryStats[cat].subtopics[sub] = { total: 0, correct: 0 };
            }
            categoryStats[cat].subtopics[sub].total++;
            if (isCorrect) categoryStats[cat].subtopics[sub].correct++;

            // Question Review payload for student
            questionReviews.push({
                questionId: sq.questionId,
                question_text: sq.question_text,
                category: sq.category,
                subtopic: sq.subtopic,
                difficulty: sq.difficulty,
                options: sq.options,
                selectedOptionId: selectedOpt,
                correct_option_id: orig.correct_option_id,
                isCorrect: !!isCorrect,
                explanation: orig.explanation,
                marks: qMarks,
            });

            // Question Attempt History entry for repetition tracking
            historyDocs.push({
                student: studentId,
                question: sq.questionId,
                session: session._id,
                category: cat,
                difficulty: sq.difficulty,
                selectedOptionId: selectedOpt,
                isCorrect: !!isCorrect,
                attemptedAt: now,
            });
        });

        // Compute percentage and passing status
        const percentage = totalMarks > 0 ? Math.round((totalScore / totalMarks) * 100) : 0;
        const levelConfig = await AssessmentLevel.findOne({ slug: session.level }).lean();
        const passingThreshold = levelConfig ? levelConfig.passingPercentage : 60;
        const passed = percentage >= passingThreshold;

        // Generate dynamic strengths & improvement areas
        const strengths = [];
        const areasForImprovement = [];
        const recommendations = [];

        Object.keys(categoryStats).forEach((cat) => {
            const stat = categoryStats[cat];
            const catPct = stat.maxScore > 0 ? Math.round((stat.score / stat.maxScore) * 100) : 0;
            stat.percentage = catPct;

            const formattedCat = cat.replace(/_/g, " ").toUpperCase();
            if (catPct >= 70) {
                strengths.push(`${formattedCat} (${catPct}% accuracy)`);
            } else {
                areasForImprovement.push(`${formattedCat} (${catPct}% accuracy)`);
                recommendations.push(
                    `Focus on foundational topics in ${formattedCat}. Practice target problem sets.`
                );
            }
        });

        if (recommendations.length === 0) {
            recommendations.push("Excellent performance across all domains. Proceed to higher difficulty levels.");
        }

        // Update session state
        session.status = isAutoSubmitted || isTimeExpired ? "EXPIRED" : "COMPLETED";
        session.autoSubmitted = !!(isAutoSubmitted || isTimeExpired);
        session.score = totalScore;
        session.totalMarks = totalMarks;
        session.correctCount = correctCount;
        session.incorrectCount = incorrectCount;
        session.unansweredCount = unansweredCount;
        session.percentage = percentage;
        session.passed = passed;
        session.categoryBreakdown = categoryStats;
        session.strengths = strengths;
        session.areasForImprovement = areasForImprovement;
        session.recommendations = recommendations;
        session.submittedAt = now;

        await session.save();

        // Bulk insert question attempt history
        if (historyDocs.length > 0) {
            await QuestionAttemptHistory.insertMany(historyDocs).catch((e) =>
                console.warn("Error inserting question history:", e.message)
            );
        }

        // Save legacy AssessmentAttempt for dashboard & placement prediction compatibility
        try {
            const attempt = new AssessmentAttempt({
                student: studentId,
                session: session._id,
                level: session.level,
                testId: session.assessmentSlug,
                testTitle: session.assessmentTitle,
                totalScore: percentage,
                totalQuestions: session.questions.length,
                correctCount,
                categoryScores: categoryStats,
                strengths,
                areasForImprovement,
                recommendations,
                answers: session.responses.map((r) => ({
                    questionId: r.questionId.toString(),
                    selectedOptionId: r.selectedOptionId,
                    timeTakenSeconds: 30,
                })),
                completedAt: now,
            });
            await attempt.save();
        } catch (attErr) {
            console.warn("Could not record AssessmentAttempt backward-compatible doc:", attErr.message);
        }

        return {
            sessionId: session._id,
            assessmentTitle: session.assessmentTitle,
            level: session.level,
            status: session.status,
            score: totalScore,
            totalMarks,
            correctCount,
            incorrectCount,
            unansweredCount,
            percentage,
            passed,
            autoSubmitted: session.autoSubmitted,
            categoryBreakdown: categoryStats,
            strengths,
            areasForImprovement,
            recommendations,
            submittedAt: session.submittedAt,
            questionReviews,
        };
    }

    /**
     * Helper to auto-finalize an expired session
     */
    async finalizeExpiredSession(sessionId, studentId) {
        return this.submitSession(studentId, {
            sessionId,
            answers: [],
            isAutoSubmitted: true,
        });
    }

    /**
     * Format submission result if session already completed
     */
    async formatSubmissionResult(session) {
        const questionIds = session.questions.map((q) => q.questionId);
        const originalQuestions = await QuestionBank.find({
            _id: { $in: questionIds },
        })
            .select("+correct_option_id +explanation")
            .lean();

        const origMap = {};
        originalQuestions.forEach((oq) => {
            origMap[oq._id.toString()] = oq;
        });

        const questionReviews = session.questions.map((sq) => {
            const qIdStr = sq.questionId.toString();
            const orig = origMap[qIdStr] || {};
            const userResp = session.responses.find(
                (r) => r.questionId.toString() === qIdStr
            );
            const selectedOpt = userResp ? userResp.selectedOptionId : "";

            return {
                questionId: sq.questionId,
                question_text: sq.question_text,
                category: sq.category,
                subtopic: sq.subtopic,
                difficulty: sq.difficulty,
                options: sq.options,
                selectedOptionId: selectedOpt,
                correct_option_id: orig.correct_option_id,
                isCorrect: selectedOpt && selectedOpt === orig.correct_option_id,
                explanation: orig.explanation,
                marks: sq.marks || 1,
            };
        });

        return {
            sessionId: session._id,
            assessmentTitle: session.assessmentTitle,
            level: session.level,
            status: session.status,
            score: session.score,
            totalMarks: session.totalMarks,
            correctCount: session.correctCount,
            incorrectCount: session.incorrectCount,
            unansweredCount: session.unansweredCount,
            percentage: session.percentage,
            passed: session.passed,
            autoSubmitted: session.autoSubmitted,
            categoryBreakdown: session.categoryBreakdown,
            strengths: session.strengths,
            areasForImprovement: session.areasForImprovement,
            recommendations: session.recommendations,
            submittedAt: session.submittedAt,
            questionReviews,
        };
    }

    /**
     * Get student's completed assessment history
     */
    async getHistory(studentId) {
        const sessions = await AssessmentSession.find({
            student: studentId,
            status: { $in: ["COMPLETED", "EXPIRED"] },
        })
            .sort({ submittedAt: -1 })
            .limit(20)
            .lean();

        return sessions.map((s) => ({
            _id: s._id,
            testId: s.assessmentSlug,
            testTitle: s.assessmentTitle,
            level: s.level,
            totalScore: s.percentage,
            score: s.score,
            totalMarks: s.totalMarks,
            correctCount: s.correctCount,
            totalQuestions: s.questions ? s.questions.length : 0,
            passed: s.passed,
            autoSubmitted: s.autoSubmitted,
            categoryBreakdown: s.categoryBreakdown,
            strengths: s.strengths,
            areasForImprovement: s.areasForImprovement,
            completedAt: s.submittedAt || s.updatedAt,
        }));
    }
}

module.exports = new AssessmentService();
