const Student = require("../models/Student");

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
        const allowedFields = [
            "name",
            "email",
            "phone",
            "guardian",
            "guardianPhone",
            "dob",
            "department",
            "university",
            "currentYear",
            "address",
            "profilePhoto",
            "portfolio",
            "resume",
            "bio",
            "academic",
            "skills",
            "certifications",
            "codingProfiles",
            "projects",
            "internships",
            "achievements",
            "socialLinks"
        ];

        const update = {};

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                update[field] = field === "email"
                    ? req.body[field].trim().toLowerCase()
                    : req.body[field];
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
        res.status(500).json({
            success: false,
            message: "Profile update failed"
        });
    }
};