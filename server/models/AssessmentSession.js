const mongoose = require("mongoose");

const sessionQuestionSchema = new mongoose.Schema(
    {
        questionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "QuestionBank",
            required: true,
        },
        question_text: {
            type: String,
            required: true,
        },
        category: {
            type: String,
            required: true,
        },
        subtopic: {
            type: String,
            required: true,
        },
        difficulty: {
            type: String,
            required: true,
        },
        options: [
            {
                option_id: String,
                text: String,
            },
        ],
        marks: {
            type: Number,
            default: 1,
        },
    },
    { _id: false }
);

const sessionResponseSchema = new mongoose.Schema(
    {
        questionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "QuestionBank",
            required: true,
        },
        selectedOptionId: {
            type: String,
            default: "",
        },
        answeredAt: {
            type: Date,
            default: Date.now,
        },
        isMarkedForReview: {
            type: Boolean,
            default: false,
        },
    },
    { _id: false }
);

const assessmentSessionSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: true,
            index: true,
        },
        assessment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Assessment",
            required: true,
        },
        assessmentSlug: {
            type: String,
            required: true,
            index: true,
        },
        assessmentTitle: {
            type: String,
            required: true,
        },
        level: {
            type: String,
            required: true,
            enum: ["beginner", "intermediate", "advanced", "expert"],
            default: "intermediate",
            index: true,
        },
        durationMinutes: {
            type: Number,
            required: true,
        },
        startTime: {
            type: Date,
            default: Date.now,
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: true,
        },
        status: {
            type: String,
            enum: ["IN_PROGRESS", "COMPLETED", "EXPIRED", "ABANDONED"],
            default: "IN_PROGRESS",
            index: true,
        },
        questions: [sessionQuestionSchema],
        responses: [sessionResponseSchema],

        // Post-submission evaluated fields
        score: {
            type: Number,
            default: 0,
        },
        totalMarks: {
            type: Number,
            default: 0,
        },
        correctCount: {
            type: Number,
            default: 0,
        },
        incorrectCount: {
            type: Number,
            default: 0,
        },
        unansweredCount: {
            type: Number,
            default: 0,
        },
        percentage: {
            type: Number,
            default: 0,
        },
        passed: {
            type: Boolean,
            default: false,
        },
        categoryBreakdown: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        strengths: [{ type: String }],
        areasForImprovement: [{ type: String }],
        recommendations: [{ type: String }],
        submittedAt: {
            type: Date,
        },
        autoSubmitted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Compound indexes for active session checks & student history
assessmentSessionSchema.index({ student: 1, status: 1 });
assessmentSessionSchema.index({ student: 1, createdAt: -1 });

module.exports = mongoose.model("AssessmentSession", assessmentSessionSchema);
