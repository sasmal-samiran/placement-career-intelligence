const MentorConversation = require("../models/MentorConversation");
const { loadCareerMetrics } = require("../services/careerMetrics");

const createReply = (message, readinessScore) => {
    const question = message.toLowerCase();
    let recommendation = "build one practical project and keep a consistent coding practice routine";

    if (question.includes("resume")) {
        recommendation = "add measurable outcomes to your project bullets and tailor keywords to each role";
    } else if (question.includes("placement")) {
        recommendation = "practice data structures, communication, and one mock interview each week";
    } else if (question.includes("interview")) {
        recommendation = "prepare concise STAR examples and explain the trade-offs in your strongest project";
    } else if (question.includes("skill")) {
        recommendation = "choose one skill that complements your current profile and demonstrate it in a project";
    }

    return `Based on your profile, focus on ${recommendation}. Your current readiness score is ${readinessScore}%.`;
};

exports.getConversation = async (req, res) => {
    const conversation = await MentorConversation.findOne({ student: req.user.id }).lean();
    res.json({
        success: true,
        data: conversation?.messages || []
    });
};

exports.sendMessage = async (req, res) => {
    const input = req.body.text ?? req.body.message;
    const message = typeof input === "string" ? input.trim() : "";
    if (!message) {
        return res.status(400).json({
            success: false,
            message: "Message is required"
        });
    }

    if (message.length > 4000) {
        return res.status(400).json({
            success: false,
            message: "Message must be 4000 characters or fewer"
        });
    }

    const metrics = await loadCareerMetrics(req.user.id);
    const reply = createReply(message, metrics.readinessScore);
    const messages = [
        { role: "user", text: message },
        { role: "ai", text: reply }
    ];
    const conversation = await MentorConversation.findOneAndUpdate(
        { student: req.user.id },
        {
            $setOnInsert: { student: req.user.id },
            $push: { messages: { $each: messages } }
        },
        { returnDocument: "after", upsert: true, runValidators: true }
    );

    res.status(201).json({
        success: true,
        data: conversation.messages.slice(-2),
        reply
    });
};