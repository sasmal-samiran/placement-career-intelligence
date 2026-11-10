const mongoose = require("mongoose");

const assessmentLevelSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        description: {
            type: String,
            required: true,
        },
        durationMinutes: {
            type: Number,
            required: true,
            min: 5,
            max: 60,
        },
        totalQuestions: {
            type: Number,
            required: true,
            min: 5,
            max: 50,
        },
        passingPercentage: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
            default: 60,
        },
        difficultyDistribution: {
            easy: { type: Number, default: 0 },
            medium: { type: Number, default: 0 },
            hard: { type: Number, default: 0 },
            expert: { type: Number, default: 0 },
        },
        badge: {
            type: String,
            default: "Level",
        },
        color: {
            type: String,
            default: "info",
        },
        order: {
            type: Number,
            default: 1,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("AssessmentLevel", assessmentLevelSchema);
