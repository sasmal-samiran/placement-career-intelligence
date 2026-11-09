const Student = require("../models/Student");
const PlacementPrediction = require("../models/PlacementPrediction");
const { loadCareerMetrics } = require("../services/careerMetrics");

exports.getDashboard = async (req, res) => {
    const [student, metrics, latestPrediction] = await Promise.all([
        Student.findById(req.user.id).select("name email phone branch department university collegeTier").lean(),
        loadCareerMetrics(req.user.id),
        PlacementPrediction.findOne({ student: req.user.id })
            .where("prediction").exists(true)
            .sort({ createdAt: -1 })
            .lean()
    ]);

    const profileFields = ["name", "email", "phone", "university", "collegeTier"];
    const hasBranch = Boolean(student?.branch || student?.department);
    const completedFields = profileFields.filter(field => Boolean(student?.[field])).length + (hasBranch ? 1 : 0);
    const profileCompletion = Math.round(
        (completedFields + Number(metrics.semesters.length > 0) + Number(metrics.skills.length > 0) +
            Number(metrics.internships > 0) + Number(Boolean(metrics.resume?.fileUrl))) / 10 * 100
    );

    const placementScore = latestPrediction ? latestPrediction.score : null;
    const predictionLevel = latestPrediction ? latestPrediction.prediction : null;

    res.json({
        success: true,
        data: {
            stats: {
                cgpa: metrics.cgpa,
                attendance: metrics.averageAttendance,
                codingScore: metrics.codingScore,
                placementPredictionScore: placementScore,
                placementChance: placementScore ?? 0,
                predictionLevel
            },
            semesters: metrics.semesters.map(({ semester, sgpa }) => ({ semester, sgpa })),
            profileCompletion,
            activity: []
        }
    });
};
