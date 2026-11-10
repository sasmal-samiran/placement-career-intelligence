const Student = require("../models/Student");
const PlacementPrediction = require("../models/PlacementPrediction");
const { loadCareerMetrics } = require("../services/careerMetrics");

exports.getDashboard = async (req, res) => {
    try {
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

        const latestSem = metrics.latestSemester;
        const coding = metrics.codingMetrics;

        res.json({
            success: true,
            data: {
                stats: {
                    // 1. Dynamic Latest Semester SGPA & Label
                    latestSgpa: latestSem ? latestSem.sgpa : null,
                    latestSemester: latestSem ? latestSem.semester : null,
                    latestSemesterNumber: latestSem ? latestSem.semesterNumber : null,
                    hasAcademic: Boolean(latestSem && latestSem.sgpa !== null),

                    // 2. Dynamic Latest Semester Attendance (belongs to same latest semester)
                    latestAttendance: latestSem ? latestSem.attendance : null,

                    // Fallbacks & Cumulative stats for overall summary
                    cgpa: metrics.cgpa,
                    averageAttendance: metrics.averageAttendance,
                    attendance: latestSem?.attendance != null ? latestSem.attendance : (metrics.averageAttendance || null),

                    // 3. Dynamic Coding Profile Score
                    codingScore: coding ? coding.score : null,
                    hasCodingProfile: coding ? coding.hasProfile : false,
                    codingDetails: coding || {
                        score: null,
                        hasProfile: false,
                        totalProblems: 0,
                        contestRating: 0,
                        totalBadges: 0,
                        platformsCount: 0
                    },

                    // Placement Prediction
                    placementPredictionScore: placementScore,
                    placementChance: placementScore ?? 0,
                    predictionLevel
                },
                latestSemester: latestSem,
                semesters: metrics.semesters.map(({ semester, sgpa, attendance, credits, percentage }) => ({
                    semester,
                    sgpa: Number(sgpa || 0),
                    attendance: Number(attendance || 0),
                    credits: Number(credits || 0),
                    percentage: Number(percentage || 0)
                })),
                profileCompletion,
                activity: []
            }
        });
    } catch (err) {
        console.error("getDashboard error:", err);
        res.status(500).json({
            success: false,
            message: "Failed to load dashboard statistics",
            error: err.message
        });
    }
};
