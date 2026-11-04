const Student = require("../models/Student");
const { loadCareerMetrics } = require("../services/careerMetrics");

exports.getDashboard = async (req, res) => {
    const [student, metrics] = await Promise.all([
        Student.findById(req.user.id).select("name email phone department university address").lean(),
        loadCareerMetrics(req.user.id)
    ]);

    const profileFields = ["name", "email", "phone", "department", "university", "address"];
    const completedFields = profileFields.filter(field => Boolean(student?.[field])).length;
    const profileCompletion = Math.round(
        (completedFields + Number(metrics.semesters.length > 0) + Number(metrics.skills.length > 0) +
            Number(metrics.internships > 0) + Number(Boolean(metrics.resume?.fileUrl))) / 10 * 100
    );

    res.json({
        success: true,
        data: {
            stats: {
                cgpa: metrics.cgpa,
                attendance: metrics.attendanceScore,
                codingScore: metrics.codingScore,
                placementChance: metrics.readinessScore
            },
            semesters: metrics.semesters.map(({ semester, sgpa }) => ({ semester, sgpa })),
            profileCompletion,
            activity: []
        }
    });
};