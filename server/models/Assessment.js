const mongoose = require("mongoose");

const assessmentSchema = new mongoose.Schema(
    {
        title: {
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
        category: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        description: {
            type: String,
            required: true,
        },
        icon: {
            type: String,
            default: "bi-journal-check",
        },
        badge: {
            type: String,
            default: "Technical",
        },
        badgeColor: {
            type: String,
            default: "primary",
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

module.exports = mongoose.model("Assessment", assessmentSchema);
