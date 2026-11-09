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
                
                category: {
                    type: String,
                    default: "Other"
                },

                level: {
                    type: String,
                    default: "Beginner"
                },

                score: {
                    type: Number,
                    default: 0
                },

                validated: {
                    type: Boolean,
                    default: false
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