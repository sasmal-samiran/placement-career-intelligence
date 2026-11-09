const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
    {
        studentId: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: true,
            select: false
        },

        phone: {
            type: String,
            default: ""
        },

        dob: {
            type: Date,
            default: null
        },

        branch: {
            type: String,
            default: ""
        },

        collegeTier: {
            type: Number,
            enum: [1, 2, 3],
            default: 3
        },

        university: {
            type: String,
            default: ""
        },

        currentYear: {
            type: String,
            default: ""
        },

        targetJobRole: {
            type: String,
            default: "",
            trim: true
        },

        profilePhoto: {
            type: String,
            default: ""
        },

        portfolio: {
            url: {
                type: String,
                default: ""
            },
            visibility: {
                type: String,
                default: "public"
            }
        },

        bio: {
            type: String,
            default: ""
        },

        achievements: [
            {
                title: {
                    type: String,
                    required: true
                },
                description: {
                    type: String,
                    default: ""
                },
                year: {
                    type: String,
                    default: ""
                }
            }
        ],

        socialLinks: {
            linkedin: {
                type: String,
                default: ""
            },
            github: {
                type: String,
                default: ""
            },
            instagram: {
                type: String,
                default: ""
            },
            website: {
                type: String,
                default: ""
            }
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Student", studentSchema);
