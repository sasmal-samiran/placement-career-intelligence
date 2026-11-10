const mongoose = require("mongoose");

const questionOptionSchema = new mongoose.Schema(
    {
        option_id: {
            type: String,
            required: true,
            trim: true,
        },
        text: {
            type: String,
            required: true,
            trim: true,
        },
    },
    { _id: false }
);

const questionBankSchema = new mongoose.Schema(
    {
        question_text: {
            type: String,
            required: true,
            trim: true,
        },
        category: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        subtopic: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        difficulty: {
            type: String,
            required: true,
            enum: ["easy", "medium", "hard", "expert"],
            index: true,
        },
        options: {
            type: [questionOptionSchema],
            validate: {
                validator: function (opts) {
                    return Array.isArray(opts) && opts.length >= 2;
                },
                message: "A question must have at least 2 options",
            },
            required: true,
        },
        correct_option_id: {
            type: String,
            required: true,
            select: false, // Security: never expose in default queries
        },
        explanation: {
            type: String,
            required: true,
            select: false, // Security: never expose in exam mode
        },
        marks: {
            type: Number,
            default: 1,
            min: 1,
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

// Compound indexes for optimal question selection performance
questionBankSchema.index({ category: 1, difficulty: 1, isActive: 1 });
questionBankSchema.index({ category: 1, subtopic: 1, isActive: 1 });

module.exports = mongoose.model("QuestionBank", questionBankSchema);
