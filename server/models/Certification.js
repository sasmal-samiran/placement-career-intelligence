const mongoose = require("mongoose");

const certificationSchema = new mongoose.Schema(
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

        issuer: {
            type: String,
            default: "",
            trim: true
        },

        issueDate: {
            type: String,
            default: "",
            trim: true
        },

        year: {
            type: String,
            default: "",
            trim: true
        },

        certificate: {
            type: String,
            default: "",
            trim: true
        },

        validated: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

// Validation logic: must have certificate file
certificationSchema.pre("save", function() {
    this.validated = Boolean(this.certificate && this.certificate.trim());
});

module.exports = mongoose.model("Certification", certificationSchema);
