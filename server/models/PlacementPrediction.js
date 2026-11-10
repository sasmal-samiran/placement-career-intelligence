const mongoose = require("mongoose");

const placementPredictionSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: true,
            index: true
        },
        score: {
            type: Number,
            min: 0,
            max: 100,
            required: true
        },
        prediction: {
            type: String,
            enum: ["High", "Moderate", "Low", "Very Low"]
        },
        factors: [
            {
                name: {
                    type: String,
                    required: true
                },
                score: {
                    type: Number,
                    min: 0,
                    max: 100,
                    required: true
                }
            }
        ]
    },
    {
        timestamps: true
    }
);

placementPredictionSchema.index({ student: 1, createdAt: -1 });

module.exports = mongoose.model("PlacementPrediction", placementPredictionSchema);