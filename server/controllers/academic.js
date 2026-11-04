const Academic = require("../models/Academic");

exports.getAcademic = async (req, res) => {
    try {
        const data = await Academic.findOne({ student: req.user.id });

        res.json({
            success: true,
            data: data || { semesters: [] }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Could not fetch academic data"
        });
    }
};

exports.updateAcademic = async (req, res) => {
    try {
        const semesters = Array.isArray(req.body.semesters) ? req.body.semesters : [];

        const data = await Academic.findOneAndUpdate(
            { student: req.user.id },
            {
                student: req.user.id,
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
        res.status(500).json({
            success: false,
            message: "Academic update failed"
        });
    }
};