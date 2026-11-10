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
            required: true,
            trim: true
        },

        role: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            default: ""
        },

        startDate: {
            type: String,
            default: ""
        },

        endDate: {
            type: String,
            default: ""
        },

        date: {
            type: String,
            default: ""
        },

        status: {
            type: String,
            default: "Completed"
        },

        certificate: {
            type: String,
            default: "",
            trim: true
        },

        validated: {
            type: Boolean,
            default: false
        },

        skills: [
            String
        ]
    },
    {
        timestamps: true
    }
);

// Validation logic: must have internship certificate
internshipSchema.pre("save", function() {
    this.validated = Boolean(this.certificate && this.certificate.trim());
});

module.exports = mongoose.model("Internship", internshipSchema);
