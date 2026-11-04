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
            required: true
        },

        issuer: String,

        issueDate: String,

        year: String,

        icon: String,

        credentialId: String,

        credentialUrl: String

    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "Certification",
    certificationSchema
);