const mongoose = require("mongoose");

const mentorConversationSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: true,
            unique: true
        },
        messages: [
            {
                role: {
                    type: String,
                    enum: ["user", "ai"],
                    required: true
                },
                text: {
                    type: String,
                    required: true,
                    maxlength: 4000
                },
                createdAt: {
                    type: Date,
                    default: Date.now
                }
            }
        ]
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("MentorConversation", mentorConversationSchema);