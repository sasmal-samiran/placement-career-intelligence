const mongoose = require("mongoose");

const codingSchema = new mongoose.Schema(
    {

        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: true,
            unique: true
        },

        profiles: [

            {
                platform: String,

                username: String,

                url: String,

                score: {
                    type: Number,
                    default: 0
                },

                problemsSolved: {
                    type: Number,
                    default: 0
                },

                contributions: {
                    type: String,
                    default: ""
                },

                contestRating: {
                    type: Number,
                    default: 0
                },

                badges: {
                    type: Number,
                    default: 0
                }
            }

        ]

    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "Coding",
    codingSchema
);