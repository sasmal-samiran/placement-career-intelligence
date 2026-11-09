const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const Student = require("../models/Student");
const Academic = require("../models/Academic");
const Skill = require("../models/Skill");
const Project = require("../models/Project");
const Internship = require("../models/Internship");
const Certification = require("../models/Certification");
const Coding = require("../models/Coding");
const Resume = require("../models/Resume");
const PlacementPrediction = require("../models/PlacementPrediction");
const MentorConversation = require("../models/MentorConversation");

// GET PROFILE
exports.getProfile = async (req, res) => {
    try {
        const student = await Student.findById(req.user.id).select("-password");

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student profile not found"
            });
        }

        res.json({
            success: true,
            data: student
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Could not fetch profile"
        });
    }
};

// UPDATE PROFILE
exports.updateProfile = async (req, res) => {
    try {
        if (req.body.dob !== undefined && req.body.dob !== "" && !isValidDateOfBirth(req.body.dob)) {
            return res.status(400).json({
                success: false,
                message: "Date of birth must be a valid date in YYYY-MM-DD format and cannot be in the future"
            });
        }

        const allowedFields = [
            "name",
            "email",
            "phone",
            "dob",
            "branch",
            "department",
            "collegeTier",
            "university",
            "currentYear",
            "targetJobRole",
            "profilePhoto",
            "portfolio",
            "bio",
            "achievements",
            "socialLinks"
        ];

        const update = {};

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                if (field === "email") {
                    update[field] = req.body[field].trim().toLowerCase();
                } else if (field === "dob") {
                    if (!req.body[field]) {
                        update[field] = null;
                    } else {
                        const dateStr = String(req.body[field]).slice(0, 10);
                        update[field] = new Date(`${dateStr}T00:00:00.000Z`);
                    }
                } else if (field === "collegeTier") {
                    update[field] = Number(req.body[field]) || 3;
                } else if (field === "branch") {
                    update.branch = req.body.branch;
                    update.department = req.body.branch;
                } else if (field === "targetJobRole") {
                    update.targetJobRole = String(req.body[field] || "").trim();
                } else {
                    update[field] = req.body[field];
                }
            }
        });

        const student = await Student.findByIdAndUpdate(
            req.user.id,
            update,
            {
                new: true,
                runValidators: true
            }
        ).select("-password");

        res.json({
            success: true,
            message: "Profile updated successfully",
            data: student
        });
    } catch (error) {
        console.error("updateProfile error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Profile update failed"
        });
    }
};

function isValidDateOfBirth(value) {
    if (!value) return true;
    if (typeof value !== "string") return false;
    const dateStr = value.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return false;
    }

    const date = new Date(value.includes("T") ? value : `${dateStr}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date <= new Date();
}

// DELETE AN ACHIEVEMENT
exports.deleteAchievement = async (req, res) => {
    try {
        const idOrTitle = req.params.id;
        if (!idOrTitle) {
            return res.status(400).json({
                success: false,
                message: "Achievement identifier is required"
            });
        }

        let pullCondition;
        if (mongoose.Types.ObjectId.isValid(idOrTitle)) {
            pullCondition = { _id: idOrTitle };
        } else {
            pullCondition = { title: decodeURIComponent(idOrTitle) };
        }

        const student = await Student.findByIdAndUpdate(
            req.user.id,
            {
                $pull: {
                    achievements: pullCondition
                }
            },
            { new: true }
        ).select("-password");

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found"
            });
        }

        res.json({
            success: true,
            message: "Achievement deleted successfully",
            data: student.achievements
        });
    } catch (error) {
        console.error("deleteAchievement error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete achievement"
        });
    }
};

// DELETE ACCOUNT
exports.deleteAccount = async (req, res) => {
    try {
        const studentId = req.user.id;

        try {
            const resume = await Resume.findOne({ student: studentId });
            if (resume?.fileName) {
                const filePath = path.join(__dirname, "..", "uploads", "resumes", resume.fileName);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
        } catch (fileErr) {
            console.error("Resume file cleanup error:", fileErr);
        }

        await Promise.all([
            Student.findByIdAndDelete(studentId),
            Academic.deleteMany({ student: studentId }),
            Skill.deleteMany({ student: studentId }),
            Project.deleteMany({ student: studentId }),
            Internship.deleteMany({ student: studentId }),
            Certification.deleteMany({ student: studentId }),
            Coding.deleteMany({ student: studentId }),
            Resume.deleteMany({ student: studentId }),
            PlacementPrediction.deleteMany({ student: studentId }),
            MentorConversation.deleteMany({ student: studentId })
        ]);

        res.json({
            success: true,
            message: "Account and all associated records deleted successfully"
        });
    } catch (error) {
        console.error("deleteAccount error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete account"
        });
    }
};
