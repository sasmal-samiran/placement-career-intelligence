const Academic = require("../models/Academic");

exports.getAcademic = async (req, res) => {
    try {
        const data = await Academic.findOne({ student: req.user.id });

        res.json({
            success: true,
            data: data || { semesters: [], cgpa: 0, averageAttendance: 0 }
        });
    } catch (error) {
        console.error("getAcademic error:", error);
        res.status(500).json({
            success: false,
            message: "Could not fetch academic data"
        });
    }
};

exports.updateAcademic = async (req, res) => {
    try {
        const semesters = Array.isArray(req.body.semesters) ? req.body.semesters : [];

        // Calculate weighted CGPA
        const totalCredits = semesters.reduce((sum, s) => sum + Number(s.credits || 0), 0);
        const weightedSum = semesters.reduce(
            (sum, s) => sum + (Number(s.sgpa || 0) * Number(s.credits || 0)),
            0
        );
        const cgpa = totalCredits > 0
            ? Number((weightedSum / totalCredits).toFixed(2))
            : semesters.length
                ? Number((semesters.reduce((sum, s) => sum + Number(s.sgpa || 0), 0) / semesters.length).toFixed(2))
                : 0;

        // Calculate average attendance across semesters
        const averageAttendance = semesters.length
            ? Number((semesters.reduce((sum, s) => sum + Number(s.attendance || 0), 0) / semesters.length).toFixed(1))
            : 0;

        const data = await Academic.findOneAndUpdate(
            { student: req.user.id },
            {
                student: req.user.id,
                cgpa,
                averageAttendance,
                semesters
            },
            {
                new: true,
                upsert: true,
                runValidators: true
            }
        );

        res.json({
            success: true,
            message: "Academic data updated",
            data
        });
    } catch (error) {
        console.error("updateAcademic error:", error);
        res.status(500).json({
            success: false,
            message: "Academic update failed"
        });
    }
};
