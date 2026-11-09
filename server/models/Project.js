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
            required: true,
            trim: true
        },

        description: {
            type: String,
            default: ""
        },

        technologies: [
            String
        ],

        githubUrl: {
            type: String,
            default: "",
            trim: true
        },

        liveUrl: {
            type: String,
            default: "",
            trim: true
        },

        documentationUrl: {
            type: String,
            default: "",
            trim: true
        },

        validated: {
            type: Boolean,
            default: false
        },

        status: {
            type: String,
            default: "Completed"
        },

        startDate: {
            type: String,
            default: ""
        },

        endDate: {
            type: String,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

// Automatic validation check pre-save: must have documentation and github repo
projectSchema.pre("save", function() {
    this.validated = Boolean(this.githubUrl && this.documentationUrl);
});

module.exports = mongoose.model("Project", projectSchema);
