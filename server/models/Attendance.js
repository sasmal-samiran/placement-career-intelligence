const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
    {

        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: true,
            unique: true
        },

        subjects: [

            {
                subject: String,

                present: {
                    type: Number,
                    default: 0
                },

                total: {
                    type: Number,
                    default: 0
                },

                percentage: {
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
    "Attendance",
    attendanceSchema
);