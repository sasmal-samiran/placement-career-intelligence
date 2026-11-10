const mongoose = require("mongoose");

const questionAttemptHistorySchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: true,
            index: true,
        },
        question: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "QuestionBank",
            required: true,
            index: true,
        },
        session: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AssessmentSession",
            required: true,
        },
        category: {
            type: String,
            required: true,
            index: true,
        },
        difficulty: {
            type: String,
            required: true,
        },
        selectedOptionId: {
            type: String,
            default: "",
        },
        isCorrect: {
            type: Boolean,
            default: false,
        },
        attemptedAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

// High performance compound indexes for uniqueness queries and repetition prevention
questionAttemptHistorySchema.index({ student: 1, question: 1 });
questionAttemptHistorySchema.index({ student: 1, category: 1, attemptedAt: -1 });

module.exports = mongoose.model("QuestionAttemptHistory", questionAttemptHistorySchema);
