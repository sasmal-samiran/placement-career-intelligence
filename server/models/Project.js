const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
    {

        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: true
        },

        name: {
            type: String,
            required: true
        },

        description: String,

        desc: String,

        tech: String,

        technologies: [
            String
        ],

        githubUrl: String,

        liveUrl: String,

        status: {
            type: String,
            default: "Completed"
        },

        startDate: String,

        endDate: String

    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "Project",
    projectSchema
);