const mongoose = require("mongoose");

const skillSchema = new mongoose.Schema(
    {

        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: true,
            unique: true
        },

        skills: [

            {
                name: {
                    type: String,
                    required: true
                },

                level: {
                    type: Number,
                    default: 50
                },

                category: {
                    type: String,
                    default: "Other"
                },

                cat: {
                    type: String,
                    default: "Other"
                }
            }

        ]

    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "Skill",
    skillSchema
);