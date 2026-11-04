const PlacementPrediction = require("../models/PlacementPrediction");
const { loadCareerMetrics } = require("../services/careerMetrics");

exports.getPrediction = async (req, res) => {
    const prediction = await PlacementPrediction.findOne({ student: req.user.id })
        .sort({ createdAt: -1 })
        .lean();

    if (prediction) {
        return res.json({ success: true, data: prediction });
    }

    const metrics = await loadCareerMetrics(req.user.id);
    res.json({
        success: true,
        data: {
            score: metrics.readinessScore,
            factors: metrics.factors,
            createdAt: null
        }
    });
};

exports.createPrediction = async (req, res) => {
    const metrics = await loadCareerMetrics(req.user.id);
    const data = await PlacementPrediction.create({
        student: req.user.id,
        score: metrics.readinessScore,
        factors: metrics.factors
    });

    res.status(201).json({
        success: true,
        message: "Placement prediction created",
        data
    });
};