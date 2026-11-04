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

        guardian: {
            type: String,
            default: ""
        },

        guardianPhone: {
            type: String,
            default: ""
        },

        dob: {
            type: String,
            default: ""
        },

        department: {
            type: String,
            default: ""
        },

        university: {
            type: String,
            default: ""
        },

        currentYear: {
            type: String,
            default: ""
        },

        address: {
            type: String,
            default: ""
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

        resume: {
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

        academic: {
            currentSemester: {
                type: String,
                default: ""
            },
            cgpa: {
                type: Number,
                default: 0
            },
            totalCredits: {
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
                    subjects: [
                        {
                            name: {
                                type: String,
                                required: true
                            },
                            marks: {
                                type: Number,
                                default: 0
                            },
                            grade: {
                                type: String,
                                default: ""
                            },
                            credits: {
                                type: Number,
                                default: 0
                            }
                        }
                    ]
                }
            ]
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
                    type: Number,
                    default: 1
                },
                yearsOfExperience: {
                    type: Number,
                    default: 0
                }
            }
        ],

        certifications: [
            {
                name: {
                    type: String,
                    required: true
                },
                issuer: {
                    type: String,
                    default: ""
                },
                issueDate: {
                    type: String,
                    default: ""
                },
                credentialId: {
                    type: String,
                    default: ""
                },
                credentialUrl: {
                    type: String,
                    default: ""
                }
            }
        ],

        codingProfiles: [
            {
                platform: {
                    type: String,
                    default: ""
                },
                username: {
                    type: String,
                    default: ""
                },
                url: {
                    type: String,
                    default: ""
                },
                score: {
                    type: Number,
                    default: 0
                },
                problemsSolved: {
                    type: Number,
                    default: 0
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
        ],

        projects: [
            {
                title: {
                    type: String,
                    required: true
                },
                description: {
                    type: String,
                    default: ""
                },
                techStack: [{
                    type: String
                }],
                githubUrl: {
                    type: String,
                    default: ""
                },
                liveUrl: {
                    type: String,
                    default: ""
                },
                role: {
                    type: String,
                    default: ""
                }
            }
        ],

        internships: [
            {
                company: {
                    type: String,
                    default: ""
                },
                role: {
                    type: String,
                    default: ""
                },
                duration: {
                    type: String,
                    default: ""
                },
                description: {
                    type: String,
                    default: ""
                }
            }
        ],

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