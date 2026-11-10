const mongoose = require("mongoose");

const academicSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: true,
            unique: true
        },

        cgpa: {
            type: Number,
            default: 0
        },

        averageAttendance: {
            type: Number,
            default: 0
        },

        semesters: [
            {
                semester: {
                    type: String,
                    required: true
                },

                sgpa: {
                    type: Number,
                    default: 0
                },

                percentage: {
                    type: Number,
                    default: 0
                },

                attendance: {
                    type: Number,
                    default: 0
                },

                credits: {
                    type: Number,
                    default: 0
                },

                subjects: [
                    {
                        name: String,
                        marks: Number,
                        grade: String,
                        credits: Number
                    }
                ]
            }
        ]
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "Academic",
    academicSchema
);
