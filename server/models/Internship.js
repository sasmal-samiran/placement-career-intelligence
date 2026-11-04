const mongoose = require("mongoose");

const internshipSchema = new mongoose.Schema(
    {

        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: true
        },

        company: {
            type: String,
            required: true
        },

        role: {
            type: String,
            required: true
        },

        description: String,

        startDate: String,

        endDate: String,

        date: String,

        status: {
            type: String,
            default: "Completed"
        },

        skills: [
            String
        ]

    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "Internship",
    internshipSchema
);