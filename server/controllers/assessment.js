const assessmentService = require("../services/assessmentService");
const AssessmentAttempt = require("../models/AssessmentAttempt");
const QuestionBank = require("../models/QuestionBank");

/**
 * GET /api/assessment/catalog
 * Retrieve all active assessment tracks and difficulty levels
 */
exports.getCatalog = async (req, res) => {
    try {
        const catalog = await assessmentService.getCatalog();
        return res.json({
            success: true,
            data: catalog,
        });
    } catch (err) {
        console.error("Error fetching assessment catalog:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to load assessment catalog",
            error: err.message,
        });
    }
};

/**
 * GET /api/assessment/active-session
 * Check and resume any active exam session with authoritative timer
 */
exports.getActiveSession = async (req, res) => {
    try {
        const studentId = req.user.id;
        const result = await assessmentService.getActiveSession(studentId);
        return res.json({
            success: true,
            data: result,
        });
    } catch (err) {
        console.error("Error retrieving active session:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to check active assessment session",
            error: err.message,
        });
    }
};

/**
 * POST /api/assessment/start
 * Initialize examination session, select questions with progressive difficulty & repetition prevention
 */
exports.startSession = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { assessmentSlug, levelSlug } = req.body;

        const sessionData = await assessmentService.startSession(studentId, {
            assessmentSlug,
            levelSlug,
        });

        return res.status(201).json({
            success: true,
            message: "Examination session started successfully",
            data: sessionData,
        });
    } catch (err) {
        console.error("Error starting assessment session:", err);
        const statusCode = err.statusCode || 400;
        return res.status(statusCode).json({
            success: false,
            message: err.message || "Failed to start assessment session",
            activeSessionId: err.activeSessionId,
            remainingSeconds: err.remainingSeconds,
        });
    }
};

/**
 * POST /api/assessment/save-draft
 * Auto-save selected answers and review flags in real-time
 */
exports.saveDraft = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { sessionId, questionId, selectedOptionId, isMarkedForReview } = req.body;

        const result = await assessmentService.saveDraft(studentId, {
            sessionId,
            questionId,
            selectedOptionId,
            isMarkedForReview,
        });

        return res.json({
            success: true,
            data: result,
        });
    } catch (err) {
        console.error("Error saving draft answer:", err);
        return res.status(400).json({
            success: false,
            message: err.message || "Failed to save draft response",
        });
    }
};

/**
 * POST /api/assessment/submit
 * Evaluate student responses, record history, and calculate scores
 */
exports.submitAssessment = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { sessionId, answers, isAutoSubmitted } = req.body;

        const result = await assessmentService.submitSession(studentId, {
            sessionId,
            answers,
            isAutoSubmitted,
        });

        return res.json({
            success: true,
            message: "Assessment submitted and evaluated successfully",
            data: result,
        });
    } catch (err) {
        console.error("Error submitting assessment:", err);
        return res.status(400).json({
            success: false,
            message: err.message || "Failed to submit assessment",
        });
    }
};

/**
 * GET /api/assessment/history
 * Fetch student past completed assessment sessions
 */
exports.getHistory = async (req, res) => {
    try {
        const studentId = req.user.id;
        const history = await assessmentService.getHistory(studentId);
        return res.json({
            success: true,
            data: history,
        });
    } catch (err) {
        console.error("Error fetching assessment history:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve assessment history",
        });
    }
};

/**
 * GET /api/assessment/profile
 * Returns latest skill profile assessment radar metrics
 */
exports.getLatestProfile = async (req, res) => {
    try {
        const latestAttempt = await AssessmentAttempt.findOne({ student: req.user.id })
            .sort({ completedAt: -1 })
            .lean();

        if (!latestAttempt) {
            return res.json({
                success: true,
                data: null,
            });
        }

        return res.json({
            success: true,
            data: {
                totalScore: latestAttempt.totalScore,
                testTitle: latestAttempt.testTitle,
                categoryScores: latestAttempt.categoryScores || {},
                strengths: latestAttempt.strengths || [],
                areasForImprovement: latestAttempt.areasForImprovement || [],
                recommendations: latestAttempt.recommendations || [],
                completedAt: latestAttempt.completedAt,
            },
        });
    } catch (err) {
        console.error("Error fetching latest assessment profile:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch skill profile",
        });
    }
};

/**
 * GET /api/assessment/questions (Legacy backward compatibility)
 * Safely fetches questions directly from MongoDB database without exposing correct answers
 */
exports.getQuestions = async (req, res) => {
    try {
        const { category, difficulty, limit = 15 } = req.query;
        const filter = { isActive: true };
        if (category) filter.category = category;
        if (difficulty) filter.difficulty = difficulty;

        const questions = await QuestionBank.find(filter)
            .select("_id question_text category subtopic difficulty options marks")
            .limit(Math.min(parseInt(limit, 10) || 15, 50))
            .lean();

        const formatted = questions.map((q) => ({
            question_id: q._id.toString(),
            category: q.category,
            subtopic: q.subtopic,
            difficulty: q.difficulty,
            question_text: q.question_text,
            options: q.options,
            marks: q.marks,
        }));

        return res.json({
            success: true,
            data: formatted,
        });
    } catch (err) {
        console.error("Error querying question bank:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch questions from database",
        });
    }
};
