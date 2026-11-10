const Skill = require("../models/Skill");

const INTELLIGENCE_SERVICE_URL = (process.env.INTELLIGENCE_SERVICE_URL || "http://localhost:8000/api").replace(/\/+$/, "");

// GET ALL SKILLS FOR LOGGED-IN STUDENT
exports.getSkills = async (req, res) => {
    try {
        const data = await Skill.findOne({
            student: req.user.id
        });

        res.json({
            success: true,
            data: data || {
                skills: []
            }
        });
    } catch (error) {
        console.error("getSkills error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch skills"
        });
    }
};

// CHECK IF SKILL ALREADY EXISTS FOR LOGGED-IN STUDENT BEFORE TAKING TEST
exports.checkSkillExists = async (req, res) => {
    try {
        const skillName = (req.query.name || req.body.name || req.query.subject || req.body.subject || "").trim();
        if (!skillName) {
            return res.status(400).json({
                success: false,
                message: "Skill name is required"
            });
        }

        // Single lightweight projection query for maximum efficiency (in-memory lookup)
        const doc = await Skill.findOne(
            { student: req.user.id },
            { "skills.name": 1, "skills.validated": 1, "skills.score": 1, "skills.level": 1, "skills.category": 1 }
        ).lean();

        const lower = skillName.toLowerCase();
        const existing = (doc?.skills || []).find(
            s => (s.name || "").trim().toLowerCase() === lower
        );

        return res.json({
            success: true,
            exists: Boolean(existing),
            skill: existing || null
        });
    } catch (error) {
        console.error("checkSkillExists error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to check skill existence"
        });
    }
};

// UPDATE SKILLS LIST
exports.updateSkills = async (req, res) => {
    try {
        const skills = Array.isArray(req.body.skills)
            ? req.body.skills.map(skill => {
                let lvl = skill.level;
                if (typeof lvl === "number") {
                    lvl = lvl >= 80 ? "Proficient" : lvl >= 50 ? "Intermediate" : "Beginner";
                }
                const score = typeof skill.score === "number" ? skill.score : 0;
                return {
                    name: (skill.name || "").trim(),
                    category: (skill.category || skill.cat || "Other").trim(),
                    level: String(lvl || "Beginner").trim(),
                    score,
                    validated: score > 0 ? true : Boolean(skill.validated)
                };
            }).filter(s => s.name)
            : [];

        const data = await Skill.findOneAndUpdate(
            { student: req.user.id },
            { student: req.user.id, skills },
            { returnDocument: "after", upsert: true }
        );

        res.json({
            success: true,
            message: "Skills updated",
            data
        });
    } catch (error) {
        console.error("updateSkills error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update skills"
        });
    }
};

// ADD OR UPDATE A SINGLE SKILL (E.G. AFTER TEST OR VALIDATE LATER)
exports.addSkill = async (req, res) => {
    try {
        const name = (req.body.name || "").trim();
        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Skill name is required"
            });
        }

        const category = (req.body.category || "Other").trim();
        let level = req.body.level;
        if (typeof level === "number") {
            level = level >= 80 ? "Proficient" : level >= 50 ? "Intermediate" : "Beginner";
        }
        level = String(level || "Beginner").trim();
        const score = typeof req.body.score === "number" ? req.body.score : 0;
        const validated = score > 0 ? true : Boolean(req.body.validated);

        // 1. Lightweight projection check: only fetch skill names in memory (O(1) Set lookup)
        const existingDoc = await Skill.findOne(
            { student: req.user.id },
            { "skills.name": 1 }
        ).lean();

        const existingNames = new Set(
            (existingDoc?.skills || []).map(s => (s.name || "").trim().toLowerCase())
        );

        const lowerName = name.toLowerCase();
        let data;

        if (existingNames.has(lowerName)) {
            // Skill already exists in the database: atomically update matching array element
            const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            data = await Skill.findOneAndUpdate(
                {
                    student: req.user.id,
                    "skills.name": { $regex: new RegExp(`^${escapedName}$`, "i") }
                },
                {
                    $set: {
                        "skills.$.category": category,
                        "skills.$.level": level,
                        "skills.$.score": score,
                        "skills.$.validated": validated
                    }
                },
                { returnDocument: "after" }
            );
        } else {
            // Skill does not exist: atomically push new skill
            data = await Skill.findOneAndUpdate(
                { student: req.user.id },
                {
                    $setOnInsert: { student: req.user.id },
                    $push: {
                        skills: {
                            name,
                            category,
                            level,
                            score,
                            validated
                        }
                    }
                },
                { returnDocument: "after", upsert: true }
            );
        }

        res.status(201).json({
            success: true,
            message: existingNames.has(lowerName) ? "Skill updated" : "Skill added",
            data
        });
    } catch (error) {
        console.error("addSkill error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to add skill"
        });
    }
};

// DELETE A SKILL
exports.deleteSkill = async (req, res) => {
    try {
        const data = await Skill.findOneAndUpdate(
            {
                student: req.user.id,
                "skills._id": req.params.id
            },
            {
                $pull: {
                    skills: {
                        _id: req.params.id
                    }
                }
            },
            {
                returnDocument: "after"
            }
        );

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Skill not found"
            });
        }

        res.json({
            success: true,
            message: "Skill deleted",
            data
        });
    } catch (error) {
        console.error("deleteSkill error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete skill"
        });
    }
};

// FETCH TEST PAPER FROM INTELLIGENCE SERVICE /test-paper
exports.getTestPaper = async (req, res) => {
    try {
        const skill = (req.body.subject || req.body.skill || req.body.name || req.query.subject || req.query.skill || "").trim();

        if (!skill) {
            return res.status(400).json({
                success: false,
                message: "Skill name or subject is required to generate a test paper"
            });
        }

        // Efficient single-query check to see if skill already exists in DB
        const existingDoc = await Skill.findOne(
            { student: req.user.id },
            { "skills.name": 1, "skills.validated": 1, "skills.score": 1, "skills.level": 1, "skills.category": 1 }
        ).lean();

        const existingSkill = (existingDoc?.skills || []).find(
            s => (s.name || "").trim().toLowerCase() === skill.toLowerCase()
        );

        const targetUrl = `${INTELLIGENCE_SERVICE_URL}/test-paper`;

        // Only send subject; limit is handled internally by intelligence API
        const payload = {
            subject: skill
        };

        let response;
        try {
            response = await fetch(targetUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
        } catch (fetchErr) {
            console.warn("Intelligence service /test-paper connection failed:", fetchErr.message);
            return res.status(503).json({
                success: false,
                message: "Intelligence test service currently unreachable.",
                error: fetchErr.message,
                exists: Boolean(existingSkill),
                existingSkill: existingSkill || null
            });
        }

        if (!response.ok) {
            let detail = "";
            try {
                detail = await response.json();
            } catch (parseErr) {
                detail = await response.text();
            }
            console.warn(`Intelligence service /test-paper returned ${response.status}:`, detail);
            return res.status(response.status).json({
                success: false,
                message: `Intelligence test service returned status ${response.status}`,
                detail,
                exists: Boolean(existingSkill),
                existingSkill: existingSkill || null
            });
        }

        const data = await response.json();
        return res.json({
            success: true,
            data,
            exists: Boolean(existingSkill),
            existingSkill: existingSkill || null
        });
    } catch (err) {
        console.error("getTestPaper error:", err);
        return res.status(500).json({
            success: false,
            message: "Error fetching test paper",
            error: err.message
        });
    }
};
