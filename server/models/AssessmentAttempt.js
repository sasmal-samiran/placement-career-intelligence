const mongoose = require("mongoose");

const assessmentAttemptSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: true,
            index: true,
        },

        testId: {
            type: String,
            default: "diag_comprehensive",
        },

        testTitle: {
            type: String,
            default: "Placement Readiness Assessment",
        },

        totalScore: {
            type: Number,
            required: true,
            default: 0,
        },

        totalQuestions: {
            type: Number,
            default: 0,
        },

        correctCount: {
            type: Number,
            default: 0,
        },

        categoryScores: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },

        strengths: [
            {
                type: String,
            },
        ],

        areasForImprovement: [
            {
                type: String,
            },
        ],

        recommendations: [
            {
                type: String,
            },
        ],

        radarChartData: {
            type: mongoose.Schema.Types.Mixed,
            default: [],
        },

        answers: [
            {
                questionId: String,
                selectedOptionId: String,
                timeTakenSeconds: Number,
            },
        ],

        completedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("AssessmentAttempt", assessmentAttemptSchema);

