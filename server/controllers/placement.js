const PlacementPrediction = require("../models/PlacementPrediction");
const Student = require("../models/Student");
const Certification = require("../models/Certification");
const Project = require("../models/Project");
const Internship = require("../models/Internship");
const { loadCareerMetrics } = require("../services/careerMetrics");

exports.getPrediction = async (req, res) => {
    try {
        const prediction = await PlacementPrediction.findOne({ student: req.user.id })
            .where("prediction").exists(true)
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            success: true,
            data: prediction
                ? {
                    probability: prediction.score,
                    prediction: prediction.prediction,
                    factors: prediction.factors,
                    createdAt: prediction.createdAt
                }
                : null
        });
    } catch (error) {
        console.error("getPrediction error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch previous prediction"
        });
    }
};

exports.createPrediction = async (req, res) => {
    try {
        const [student, metrics, certificationsCount, projectsCount, internshipsCount, lastPrediction] = await Promise.all([
            Student.findById(req.user.id).select("dob branch department collegeTier socialLinks").lean(),
            loadCareerMetrics(req.user.id),
            Certification.countDocuments({ student: req.user.id, validated: true }),
            Project.countDocuments({ student: req.user.id, validated: true }),
            Internship.countDocuments({ student: req.user.id, validated: true }),
            PlacementPrediction.findOne({ student: req.user.id }).sort({ createdAt: -1 })
        ]);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student profile not found"
            });
        }

        const studentBranch = student.branch || student.department;
        if (!studentBranch) {
            return res.status(400).json({
                success: false,
                message: "Please select your branch in your profile before running a prediction"
            });
        }

        const age = getAge(student.dob);
        if (age === null) {
            return res.status(400).json({
                success: false,
                message: "Please add your date of birth in your profile before running a prediction"
            });
        }

        const collegeTier = Number(student.collegeTier);
        const cgpa = Number(metrics.cgpa);
        const attendance = Number(metrics.attendanceScore);

        const requestData = {
            age,
            college_tier: collegeTier,
            cgpa,
            attendance_percentage: attendance,
            dsa_problems_solved: 100,  // to be changed
            aptitude_score: 60,  // to be changed
            projects_count: Number(projectsCount) || 0,
            internships_count: Number(internshipsCount) || 0,
            certifications_count: Number(certificationsCount) || 0,
            hackathons_participated: 0, // to be changed
            competitive_programming_rating: 70,// to be changed
            study_hours_per_week: 20, // to be changed
            soft_skills_score: 80,  // to be changed
            leadership_experience: 0, // to be changed
            linkedIn_profile: student.socialLinks?.linkedin ? 1 : 0, // to be changed
            branch: studentBranch
        };

        const baseUrl = (process.env.INTELLIGENCE_SERVICE_URL || "http://localhost:8000/api").replace(/\/+$/, "");
        const serviceUrl = `${baseUrl}/placement-prediction`;

        let response;
        try {
            response = await fetch(serviceUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestData)
            });
        } catch (networkError) {
            console.error("Intelligence service network error:", networkError);
            return res.status(503).json({
                success: false,
                message: "Placement prediction AI service is currently offline. Please ensure the Python intelligence service is running on port 8000."
            });
        }

        let result;
        try {
            result = await response.json();
        } catch (parseError) {
            console.error("Intelligence service JSON parse error:", parseError);
            return res.status(502).json({
                success: false,
                message: "Placement prediction AI service returned an unreadable response"
            });
        }

        if (!response.ok) {
            return res.status(response.status).json({
                success: false,
                message: result?.detail || "Prediction request was rejected by the AI model"
            });
        }

        if (
            !Number.isFinite(result?.probability) ||
            result.probability < 0 ||
            result.probability > 100
        ) {
            console.error("Invalid prediction response:", result);
            return res.status(502).json({
                success: false,
                message: "Placement prediction service returned invalid probability metrics"
            });
        }

        // checking last prediction before storing
        const newFactors = metrics.factors || [];

        const normalizeFactors = list => (list || []).map(f => ({
            name: f.name,
            score: Number(f.score)
        }));

        const isSamePrediction =
            Boolean(lastPrediction) &&
            Number(lastPrediction.score) === Number(result.probability) &&
            lastPrediction.prediction === result.prediction &&
            JSON.stringify(normalizeFactors(lastPrediction.factors)) === JSON.stringify(normalizeFactors(newFactors));

        let data;

        if (isSamePrediction) {
            data = lastPrediction;
        } else {
            data = await PlacementPrediction.create({
                student: req.user.id,
                score: result.probability,
                prediction: result.prediction,
                factors: newFactors
            });
        }
        return res.status(201).json({
            success: true,
            message: "Placement prediction created",
            data: {
                probability: data.score,
                prediction: data.prediction,
                factors: data.factors,
                createdAt: data.createdAt
            }
        });
    } catch (error) {
        console.error("createPrediction unexpected error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error occurred while processing prediction"
        });
    }
};

function getAge(dateOfBirth) {
    if (!dateOfBirth) return null;

    const birthDate = new Date(dateOfBirth);
    if (Number.isNaN(birthDate.getTime())) return null;

    const today = new Date();
    let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
    const birthdayPending = today.getUTCMonth() < birthDate.getUTCMonth() ||
        (today.getUTCMonth() === birthDate.getUTCMonth() && today.getUTCDate() < birthDate.getUTCDate());
    if (birthdayPending) age -= 1;

    return age > 0 ? age : null;
}
