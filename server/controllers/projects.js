const path = require("path");
const fs = require("fs");
const Project = require("../models/Project");

const INTELLIGENCE_SERVICE_URL = (process.env.INTELLIGENCE_SERVICE_URL || "http://localhost:8000/api").replace(/\/+$/, "");

const docUploadDir = path.join(__dirname, "..", "uploads", "documentations");
if (!fs.existsSync(docUploadDir)) {
    fs.mkdirSync(docUploadDir, { recursive: true });
}

// Helper: Call intelligence-service /duplicate-check for projects
async function checkProjectDuplicate(studentId, projectData, existingRecords) {
    try {
        const payload = {
            student_id: String(studentId),
            type: "project",
            data: {
                name: projectData.name ? String(projectData.name).trim().substring(0, 300) : null,
                description: projectData.description ? String(projectData.description).trim().substring(0, 10000) : null,
                technologies: Array.isArray(projectData.technologies) && projectData.technologies.length > 0
                    ? projectData.technologies.slice(0, 100).map(String)
                    : null
            },
            existing_records: existingRecords
        };

        const dupRes = await fetch(`${INTELLIGENCE_SERVICE_URL}/duplicate-check`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (dupRes.ok) {
            const resData = await dupRes.json();
            return {
                is_duplicate: Boolean(resData.is_duplicate),
                similarity: typeof resData.similarity === "number" ? resData.similarity : 0
            };
        } else {
            console.warn("Intelligence service /duplicate-check returned status:", dupRes.status);
            const isDup = existingRecords.some(
                r => r.name && r.name.toLowerCase() === (projectData.name || "").toLowerCase()
            );
            return { is_duplicate: isDup, similarity: isDup ? 100 : 0 };
        }
    } catch (err) {
        console.warn("Intelligence service duplicate-check failed, fallback to name matching:", err.message);
        const isDup = existingRecords.some(
            r => r.name && r.name.toLowerCase() === (projectData.name || "").toLowerCase()
        );
        return { is_duplicate: isDup, similarity: isDup ? 100 : 0 };
    }
}

// GET ALL PROJECTS FOR LOGGED-IN STUDENT DIRECTLY FROM DATABASE
exports.getProjects = async (req, res) => {
    try {
        const data = await Project.find({
            student: req.user.id
        }).sort({
            createdAt: -1
        });

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("getProjects error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch projects"
        });
    }
};

// CREATE A PROJECT
exports.createProject = async (req, res) => {
    try {
        const name = (req.body.name || req.body.title || "").trim();
        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Project name is required"
            });
        }

        const description = req.body.description || req.body.desc || "";
        const technologies = Array.isArray(req.body.technologies)
            ? req.body.technologies
            : Array.isArray(req.body.techStack)
            ? req.body.techStack
            : typeof req.body.technologies === "string"
            ? req.body.technologies.split(",").map(t => t.trim()).filter(Boolean)
            : typeof req.body.techStack === "string"
            ? req.body.techStack.split(",").map(t => t.trim()).filter(Boolean)
            : [];

        const githubUrl = (req.body.githubUrl || req.body.githubRepoUrl || req.body.githubRepo || req.body.github || "").trim();
        const liveUrl = (req.body.liveUrl || req.body.liveDemoUrl || req.body.demoUrl || req.body.url || "").trim();
        let documentationUrl = (req.body.documentationUrl || req.body.documentation || req.body.docUrl || req.body.docs || "").trim();

        // Handle uploaded documentation file
        if (req.files && (req.files.documentation || req.files.docFile || req.files.file)) {
            const docFile = req.files.documentation || req.files.docFile || req.files.file;
            const safeName = docFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const fileName = `${Date.now()}_${safeName}`;
            const filePath = path.join(docUploadDir, fileName);
            await docFile.mv(filePath);
            documentationUrl = `/uploads/documentations/${fileName}`;
        }

        // Check duplicate projects before storing any new projects using intelligence api /duplicate-check
        const existingProjects = await Project.find({ student: req.user.id })
            .select("name description technologies")
            .lean();

        const existingRecords = existingProjects.slice(0, 250).map(p => ({
            name: p.name ? String(p.name).trim().substring(0, 300) : null,
            description: p.description ? String(p.description).trim().substring(0, 10000) : null,
            technologies: Array.isArray(p.technologies) ? p.technologies.slice(0, 100).map(String) : null
        }));

        const dupResult = await checkProjectDuplicate(
            req.user.id,
            { name, description, technologies },
            existingRecords
        );

        if (dupResult.is_duplicate) {
            return res.status(409).json({
                success: false,
                is_duplicate: true,
                similarity: dupResult.similarity,
                message: `A project with similar details already exists in your profile (${dupResult.similarity}% similarity).`
            });
        }

        // Validation logic: must have documentation and github repo
        const validated = Boolean(githubUrl && documentationUrl);

        const data = await Project.create({
            student: req.user.id,
            name,
            description,
            technologies,
            githubUrl,
            liveUrl,
            documentationUrl,
            validated,
            status: req.body.status || "Completed"
        });

        res.status(201).json({
            success: true,
            message: "Project added",
            data
        });
    } catch (error) {
        console.error("createProject error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create project"
        });
    }
};

// UPDATE A PROJECT
exports.updateProject = async (req, res) => {
    try {
        const updateData = {};
        if (req.body.name || req.body.title) {
            updateData.name = (req.body.name || req.body.title).trim();
        }
        if (req.body.description !== undefined) {
            updateData.description = req.body.description;
        }
        if (req.body.technologies !== undefined || req.body.techStack !== undefined) {
            updateData.technologies = Array.isArray(req.body.technologies)
                ? req.body.technologies
                : Array.isArray(req.body.techStack)
                ? req.body.techStack
                : typeof req.body.technologies === "string"
                ? req.body.technologies.split(",").map(t => t.trim()).filter(Boolean)
                : typeof req.body.techStack === "string"
                ? req.body.techStack.split(",").map(t => t.trim()).filter(Boolean)
                : [];
        }
        if (req.body.githubUrl !== undefined || req.body.githubRepoUrl !== undefined || req.body.githubRepo !== undefined || req.body.github !== undefined) {
            updateData.githubUrl = (req.body.githubUrl || req.body.githubRepoUrl || req.body.githubRepo || req.body.github || "").trim();
        }
        if (req.body.liveUrl !== undefined || req.body.liveDemoUrl !== undefined || req.body.demoUrl !== undefined || req.body.url !== undefined) {
            updateData.liveUrl = (req.body.liveUrl || req.body.liveDemoUrl || req.body.demoUrl || req.body.url || "").trim();
        }
        if (req.body.documentationUrl !== undefined || req.body.documentation !== undefined || req.body.docUrl !== undefined || req.body.docs !== undefined) {
            updateData.documentationUrl = (req.body.documentationUrl || req.body.documentation || req.body.docUrl || req.body.docs || "").trim();
        }

        // Handle uploaded documentation file
        if (req.files && (req.files.documentation || req.files.docFile || req.files.file)) {
            const docFile = req.files.documentation || req.files.docFile || req.files.file;
            const safeName = docFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const fileName = `${Date.now()}_${safeName}`;
            const filePath = path.join(docUploadDir, fileName);
            await docFile.mv(filePath);
            updateData.documentationUrl = `/uploads/documentations/${fileName}`;
        }

        if (req.body.status !== undefined) updateData.status = req.body.status;

        // Fetch existing project to evaluate validation logic
        const existing = await Project.findOne({
            _id: req.params.id,
            student: req.user.id
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        // If updating project details, verify no duplicate among other projects
        if (updateData.name || updateData.description) {
            const otherProjects = await Project.find({
                student: req.user.id,
                _id: { $ne: req.params.id }
            }).select("name description technologies").lean();

            const otherRecords = otherProjects.slice(0, 250).map(p => ({
                name: p.name ? String(p.name).trim().substring(0, 300) : null,
                description: p.description ? String(p.description).trim().substring(0, 10000) : null,
                technologies: Array.isArray(p.technologies) ? p.technologies.slice(0, 100).map(String) : null
            }));

            const effectiveName = updateData.name !== undefined ? updateData.name : (existing.name || "");
            const effectiveDesc = updateData.description !== undefined ? updateData.description : (existing.description || "");
            const effectiveTech = updateData.technologies !== undefined ? updateData.technologies : (existing.technologies || []);

            const dupResult = await checkProjectDuplicate(
                req.user.id,
                { name: effectiveName, description: effectiveDesc, technologies: effectiveTech },
                otherRecords
            );

            if (dupResult.is_duplicate) {
                return res.status(409).json({
                    success: false,
                    is_duplicate: true,
                    similarity: dupResult.similarity,
                    message: `Another project with similar details already exists in your profile (${dupResult.similarity}% similarity).`
                });
            }
        }

        const effectiveGithub = updateData.githubUrl !== undefined ? updateData.githubUrl : (existing.githubUrl || "");
        const effectiveDocs = updateData.documentationUrl !== undefined ? updateData.documentationUrl : (existing.documentationUrl || "");

        // Validation logic: must have documentation and github repo
        updateData.validated = Boolean(effectiveGithub && effectiveDocs);

        const data = await Project.findOneAndUpdate(
            {
                _id: req.params.id,
                student: req.user.id
            },
            updateData,
            {
                returnDocument: "after"
            }
        );

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        res.json({
            success: true,
            message: "Project updated",
            data
        });
    } catch (error) {
        console.error("updateProject error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update project"
        });
    }
};

// DELETE A PROJECT
exports.deleteProject = async (req, res) => {
    try {
        const data = await Project.findOneAndDelete({
            _id: req.params.id,
            student: req.user.id
        });

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        res.json({
            success: true,
            message: "Project deleted"
        });
    } catch (error) {
        console.error("deleteProject error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete project"
        });
    }
};
