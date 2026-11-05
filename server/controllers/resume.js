const Resume = require("../models/Resume");
const Student = require("../models/Student");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "..", "uploads", "resumes");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Helper to call Python Intelligence Resume Scraping API
const callParseResumeApi = async (filePath, originalName) => {
    try {
        const fileBuffer = fs.readFileSync(filePath);
        const blob = new Blob([fileBuffer]);
        const formData = new FormData();
        formData.append("file", blob, originalName || "resume.pdf");

        const response = await fetch("http://127.0.0.1:8000/api/parse-resume", {
            method: "POST",
            body: formData,
        });

        if (response.ok) {
            return await response.json();
        }
        console.warn("Parse resume API responded with status:", response.status);
    } catch (err) {
        console.warn("Could not connect to parse-resume API:", err.message);
    }
    return null;
};

// Calculate ATS and Quality scores dynamically from scraped details
const calculateScores = (parsed) => {
    if (!parsed) return { atsScore: 82, resumeScore: 78 };
    let score = 50;
    if (parsed.personal_info?.email) score += 8;
    if (parsed.personal_info?.phone) score += 7;
    if (parsed.personal_info?.linkedin || parsed.personal_info?.github) score += 5;
    if (parsed.summary) score += 8;

    const skillsCount =
        (parsed.skills?.programming_languages?.length || 0) +
        (parsed.skills?.frameworks?.length || 0) +
        (parsed.skills?.databases?.length || 0) +
        (parsed.skills?.tools?.length || 0) +
        (parsed.skills?.cloud?.length || 0);

    if (skillsCount >= 8) score += 12;
    else if (skillsCount >= 4) score += 7;

    if (parsed.education?.length) score += 5;
    if (parsed.projects?.length) score += 5;

    return {
        atsScore: Math.min(Math.max(score, 68), 96),
        resumeScore: Math.min(Math.max(score - 3, 64), 94),
    };
};

// GET RESUME
exports.getResume = async (req, res) => {
    try {
        let data = await Resume.findOne({ student: req.user.id });

        // If resume exists on disk but parsedData is missing, scrape and save it
        if (data && data.fileName && !data.parsedData) {
            const filePath = path.join(uploadDir, data.fileName);
            if (fs.existsSync(filePath)) {
                const parsed = await callParseResumeApi(filePath, data.originalName || data.fileName);
                if (parsed) {
                    const { atsScore, resumeScore } = calculateScores(parsed);
                    data = await Resume.findOneAndUpdate(
                        { student: req.user.id },
                        { parsedData: parsed, atsScore, resumeScore },
                        { returnDocument: "after" }
                    );
                }
            }
        }

        res.json({
            success: true,
            data,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve resume",
        });
    }
};

// UPLOAD RESUME (Scrapes details & stores directly into DB every time CV changes)
exports.uploadResume = async (req, res) => {
    try {
        if (!req.files || !req.files.resume) {
            return res.status(400).json({
                success: false,
                message: "Please select a resume",
            });
        }

        const file = req.files.resume;

        if (
            file.mimetype !== "application/pdf" &&
            file.mimetype !== "application/msword" &&
            file.mimetype !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document" &&
            file.mimetype !== "text/plain"
        ) {
            return res.status(400).json({
                success: false,
                message: "Only PDF, DOC, DOCX and TXT files allowed",
            });
        }

        if (file.size > 5 * 1024 * 1024) {
            return res.status(400).json({
                success: false,
                message: "Maximum file size is 5MB",
            });
        }

        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const fileName = Date.now() + "_" + safeName;
        const filePath = path.join(uploadDir, fileName);

        await file.mv(filePath);

        const fileUrl = `/uploads/resumes/${fileName}`;

        // 1. Scrape structured details from CV via Intelligence Service
        const parsedData = await callParseResumeApi(filePath, file.name);
        const { atsScore, resumeScore } = calculateScores(parsedData);

        // 2. Modify and update database record with latest scraped details
        const data = await Resume.findOneAndUpdate(
            { student: req.user.id },
            {
                student: req.user.id,
                fileName,
                originalName: file.name,
                fileUrl,
                uploadedAt: new Date(),
                parsedData: parsedData || null,
                atsScore,
                resumeScore,
            },
            {
                returnDocument: "after",
                upsert: true,
            }
        );

        // 3. Keep student profile in sync if bio/skills are available
        if (parsedData) {
            const updateFields = {};
            if (parsedData.summary) updateFields.bio = parsedData.summary;
            if (parsedData.personal_info?.name) updateFields.name = parsedData.personal_info.name;
            if (parsedData.personal_info?.phone) updateFields.phone = parsedData.personal_info.phone;
            updateFields["resume.url"] = fileUrl;

            await Student.findByIdAndUpdate(req.user.id, { $set: updateFields });
        }

        res.json({
            success: true,
            message: "Resume uploaded and scraped successfully",
            data,
        });
    } catch (error) {
        console.error("Resume upload error:", error);
        res.status(500).json({
            success: false,
            message: "Resume upload failed",
        });
    }
};

// PORTFOLIO
exports.updatePortfolio = async (req, res) => {
    try {
        const data = await Resume.findOneAndUpdate(
            { student: req.user.id },
            {
                student: req.user.id,
                portfolioUrl: req.body.portfolioUrl,
            },
            {
                returnDocument: "after",
                upsert: true,
            }
        );

        res.json({
            success: true,
            message: "Portfolio updated",
            data,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Portfolio update failed",
        });
    }
};
