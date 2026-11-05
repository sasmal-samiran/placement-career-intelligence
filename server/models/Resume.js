const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema(
    {

        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: true,
            unique: true
        },

        fileName: String,

        originalName: String,

        fileUrl: String,

        resumeScore: {
            type: Number,
            default: 0
        },

        atsScore: {
            type: Number,
            default: 0
        },

        uploadedAt: Date,

        portfolioUrl: {
            type: String,
            default: ""
        },

        parsedData: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        }

    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "Resume",
    resumeSchema
);