const path = require("path");
const fs = require("fs");
const Resume = require("../models/Resume");
const Student = require("../models/Student");
const Skill = require("../models/Skill");
const Project = require("../models/Project");
const Internship = require("../models/Internship");
const Certification = require("../models/Certification");

const uploadDir = path.join(__dirname, "..", "uploads", "resumes");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// GET RESUME
exports.getResume = async (req, res) => {
    try {
        const data = await Resume.findOne({ student: req.user.id });
        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("getResume error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch resume details"
        });
    }
};

// UPLOAD RESUME & EXTRACT DETAILS VIA INTELLIGENCE SERVICE
exports.uploadResume = async (req, res) => {
    try {
        if (!req.files || !req.files.resume) {
            return res.status(400).json({
                success: false,
                message: "Please select a resume file"
            });
        }

        const file = req.files.resume;

        const allowedMimes = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain"
        ];

        if (!allowedMimes.includes(file.mimetype)) {
            return res.status(400).json({
                success: false,
                message: "Only PDF, DOC, DOCX, and TXT files are allowed"
            });
        }

        if (file.size > 5 * 1024 * 1024) {
            return res.status(400).json({
                success: false,
                message: "Maximum file size is 5MB"
            });
        }

        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const fileName = `${Date.now()}_${safeName}`;
        const filePath = path.join(uploadDir, fileName);

        await file.mv(filePath);
        const fileUrl = `/uploads/resumes/${fileName}`;

        let parsedData = null;
        let aiParsed = false;

        // Call Intelligence Service to parse resume and extract details
        const INTELLIGENCE_SERVICE_URL = (process.env.INTELLIGENCE_SERVICE_URL || "http://localhost:8000/api").replace(/\/+$/, "");

        try {
            const fileBuffer = fs.readFileSync(filePath);
            const blob = new Blob([fileBuffer], { type: file.mimetype });
            const formData = new FormData();
            formData.append("file", blob, file.name);

            // Call /parse-resume to extract structured candidate profile
            const parseRes = await fetch(`${INTELLIGENCE_SERVICE_URL}/parse-resume`, {
                method: "POST",
                body: formData
            });

            if (parseRes.ok) {
                parsedData = await parseRes.json();
                aiParsed = true;
            } else {
                console.warn("Intelligence service /parse-resume returned status:", parseRes.status);
            }
        } catch (serviceErr) {
            console.warn("Intelligence service offline or unreachable during resume upload:", serviceErr.message);
        }

        // Store extracted details into separate database models
        if (parsedData) {
            // A. Store Skills in Skill model (Single lightweight read + single bulk append)
            if (parsedData.skills) {
                // 1. Fetch only existing skill names for the student in one lightweight query
                const existingDoc = await Skill.findOne(
                    { student: req.user.id },
                    { "skills.name": 1 }
                ).lean();

                const existingNames = new Set(
                    (existingDoc?.skills || []).map(s => (s.name || "").trim().toLowerCase())
                );

                const newSkills = [];
                for (const [category, items] of Object.entries(parsedData.skills)) {
                    if (Array.isArray(items)) {
                        for (const item of items) {
                            if (item && typeof item === "string" && item.trim()) {
                                const skillName = item.trim();
                                const lowerName = skillName.toLowerCase();

                                // Skip if skill already exists for this student
                                if (existingNames.has(lowerName)) {
                                    continue;
                                }

                                const cleanCategory = category.replace(/_/g, " ");
                                newSkills.push({
                                    name: skillName,
                                    category: cleanCategory,
                                    level: "Begginer",
                                    score: 0,
                                    validated: false
                                });

                                existingNames.add(lowerName); // prevent duplicate additions within the same resume
                            }
                        }
                    }
                }

                // 2. Perform a single atomic push of all new skills
                if (newSkills.length > 0) {
                    await Skill.findOneAndUpdate(
                        { student: req.user.id },
                        {
                            $setOnInsert: { student: req.user.id },
                            $push: { skills: { $each: newSkills } }
                        },
                        { upsert: true }
                    );
                }
            }

            // B. Store Projects in Project model from intelligence API / database
            if (Array.isArray(parsedData.projects) && parsedData.projects.length > 0) {
                const currentProjects = await Project.find({ student: req.user.id })
                    .select("name description technologies")
                    .lean();

                const existingProjectRecords = currentProjects.slice(0, 250).map(p => ({
                    name: p.name ? String(p.name).trim().substring(0, 300) : null,
                    description: p.description ? String(p.description).trim().substring(0, 10000) : null,
                    technologies: Array.isArray(p.technologies) ? p.technologies.slice(0, 100).map(String) : null
                }));

                for (const proj of parsedData.projects) {
                    if (proj?.name && proj.name.trim()) {
                        const projName = proj.name.trim();
                        const projDesc = (proj.description || "").trim();
                        const projTech = Array.isArray(proj.technologies) && proj.technologies.length > 0
                            ? proj.technologies.map(t => String(t).trim()).filter(Boolean)
                            : [];

                        let isDuplicate = false;
                        try {
                            const duplicatePayload = {
                                student_id: String(req.user.id),
                                type: "project",
                                data: {
                                    name: projName.substring(0, 300),
                                    description: projDesc ? projDesc.substring(0, 10000) : null,
                                    technologies: projTech.length > 0 ? projTech.slice(0, 100).map(String) : null
                                },
                                existing_records: existingProjectRecords
                            };

                            const dupRes = await fetch(`${INTELLIGENCE_SERVICE_URL}/duplicate-check`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(duplicatePayload)
                            });

                            if (dupRes.ok) {
                                const resData = await dupRes.json();
                                isDuplicate = Boolean(resData.is_duplicate);
                            } else {
                                isDuplicate = existingProjectRecords.some(
                                    r => r.name && r.name.toLowerCase() === projName.toLowerCase()
                                );
                            }
                        } catch (dupErr) {
                            console.warn("Project duplicate check fallback during resume upload:", dupErr.message);
                            isDuplicate = existingProjectRecords.some(
                                r => r.name && r.name.toLowerCase() === projName.toLowerCase()
                            );
                        }

                        if (!isDuplicate) {
                            const githubUrl = (proj.link || proj.github || "").trim();
                            const documentationUrl = (proj.documentationUrl || proj.documentation || proj.docUrl || "").trim();
                            const validated = Boolean(githubUrl && documentationUrl);

                            await Project.create({
                                student: req.user.id,
                                name: projName,
                                description: projDesc,
                                technologies: projTech,
                                githubUrl,
                                documentationUrl,
                                validated,
                                status: "Completed"
                            });

                            existingProjectRecords.push({
                                name: projName.substring(0, 300),
                                description: projDesc.substring(0, 10000) || null,
                                technologies: projTech.slice(0, 100).map(String)
                            });
                        }
                    }
                }
            }

            // C. Store Experience / Internships in Internship model
            const experiences = [
                ...(Array.isArray(parsedData.experience) ? parsedData.experience : []),
                ...(Array.isArray(parsedData.internships)
                    ? parsedData.internships.map(i => (typeof i === "string" ? { company: i, job_title: "Intern" } : i))
                    : [])
            ];

            const existingInternships = await Internship.find({ student: req.user.id })
                .select("company role description startDate endDate")
                .lean();

            const formatIsoDate = dateStr => {
                if (!dateStr || typeof dateStr !== "string") return null;
                const clean = dateStr.trim().slice(0, 10);
                if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
                    const d = new Date(clean);
                    if (!isNaN(d.getTime())) return clean;
                }
                return null;
            };

            const sanitizeInternshipRec = item => {
                const company = item.company ? String(item.company).trim().substring(0, 300) : null;
                const role = item.role ? String(item.role).trim().substring(0, 300) : null;
                const description = item.description ? String(item.description).trim().substring(0, 10000) : null;
                let start_date = formatIsoDate(item.startDate || item.start_date);
                let end_date = formatIsoDate(item.endDate || item.end_date);
                if (start_date && end_date && start_date > end_date) {
                    end_date = null;
                }
                return { company, role, description, start_date, end_date };
            };

            const existingInternshipRecords = existingInternships.slice(0, 250).map(sanitizeInternshipRec);

            for (const exp of experiences) {
                const company = exp?.company?.trim() || "";
                const role = exp?.job_title?.trim() || exp?.role?.trim() || "";
                if (!company && !role) continue;

                const compName = company || "NA";
                const roleName = role || "NA";
                const desc = Array.isArray(exp?.description) ? exp.description.join(". ") : (exp?.description || "");
                const startDate = exp?.start_date || "";
                const endDate = exp?.end_date || "";

                let isDuplicate = false;
                try {
                    const duplicatePayload = {
                        student_id: String(req.user.id),
                        type: "internship",
                        data: sanitizeInternshipRec({
                            company: compName,
                            role: roleName,
                            description: desc,
                            startDate,
                            endDate
                        }),
                        existing_records: existingInternshipRecords
                    };

                    const dupRes = await fetch(`${INTELLIGENCE_SERVICE_URL}/duplicate-check`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(duplicatePayload)
                    });

                    if (dupRes.ok) {
                        const resData = await dupRes.json();
                        isDuplicate = Boolean(resData.is_duplicate);
                    } else {
                        isDuplicate = existingInternshipRecords.some(
                            r => r.company && r.company.toLowerCase() === compName.toLowerCase() &&
                                 r.role && r.role.toLowerCase() === roleName.toLowerCase()
                        );
                    }
                } catch (dupErr) {
                    console.warn("Internship duplicate check fallback during resume upload:", dupErr.message);
                    isDuplicate = existingInternshipRecords.some(
                        r => r.company && r.company.toLowerCase() === compName.toLowerCase() &&
                             r.role && r.role.toLowerCase() === roleName.toLowerCase()
                    );
                }

                if (!isDuplicate) {
                    await Internship.create({
                        student: req.user.id,
                        company: compName,
                        role: roleName,
                        description: desc,
                        startDate,
                        endDate,
                        status: "Completed",
                        certificate: "",
                        validated: false
                    });

                    existingInternshipRecords.push(sanitizeInternshipRec({
                        company: compName,
                        role: roleName,
                        description: desc,
                        startDate,
                        endDate
                    }));
                }
            }

            // D. Store Certifications in Certification model
            if (Array.isArray(parsedData.certifications) && parsedData.certifications.length > 0) {
                const existingCerts = await Certification.find({ student: req.user.id })
                    .select("name issuer issueDate year")
                    .lean();

                const sanitizeCertRec = item => {
                    const name = item.name ? String(item.name).trim().substring(0, 300) : null;
                    const issuer = item.issuer ? String(item.issuer).trim().substring(0, 300) : null;
                    let year = null;
                    if (item.year) {
                        const y = parseInt(item.year, 10);
                        if (!isNaN(y) && y >= 1900 && y <= 2100) year = y;
                    }
                    const issue_date = item.issueDate ? String(item.issueDate).trim().slice(0, 50) : null;
                    return { name, issuer, issue_date, year };
                };

                const existingCertRecords = existingCerts.slice(0, 250).map(sanitizeCertRec);

                for (const cert of parsedData.certifications) {
                    const certName = typeof cert === "string" ? cert.trim() : cert?.name?.trim();
                    if (!certName) continue;
                    const certIssuer = typeof cert === "object" ? (cert.issuer || "").trim() : "";

                    let isDuplicate = false;
                    try {
                        const duplicatePayload = {
                            student_id: String(req.user.id),
                            type: "certification",
                            data: sanitizeCertRec({
                                name: certName,
                                issuer: certIssuer
                            }),
                            existing_records: existingCertRecords
                        };

                        const dupRes = await fetch(`${INTELLIGENCE_SERVICE_URL}/duplicate-check`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(duplicatePayload)
                        });

                        if (dupRes.ok) {
                            const resData = await dupRes.json();
                            isDuplicate = Boolean(resData.is_duplicate);
                        } else {
                            isDuplicate = existingCertRecords.some(r => {
                                if (!r.name) return false;
                                const rName = r.name.toLowerCase().trim();
                                const rIssuer = (r.issuer || "").toLowerCase().trim();
                                if (certIssuer && rIssuer) {
                                    return rName === certName.toLowerCase() && rIssuer === certIssuer.toLowerCase();
                                }
                                return rName === certName.toLowerCase();
                            });
                        }
                    } catch (dupErr) {
                        console.warn("Certification duplicate check fallback during resume upload:", dupErr.message);
                        isDuplicate = existingCertRecords.some(r => {
                            if (!r.name) return false;
                            const rName = r.name.toLowerCase().trim();
                            const rIssuer = (r.issuer || "").toLowerCase().trim();
                            if (certIssuer && rIssuer) {
                                return rName === certName.toLowerCase() && rIssuer === certIssuer.toLowerCase();
                            }
                            return rName === certName.toLowerCase();
                        });
                    }

                    if (!isDuplicate) {
                        await Certification.create({
                            student: req.user.id,
                            name: certName,
                            issuer: certIssuer,
                            certificate: "",
                            validated: false
                        });

                        existingCertRecords.push(sanitizeCertRec({
                            name: certName,
                            issuer: certIssuer
                        }));
                    }
                }
            }

            // E. Update Student bio & social links if extracted and currently empty
            if (parsedData.personal_info) {
                const student = await Student.findById(req.user.id).select("bio socialLinks portfolio").lean();
                const socialUpdates = {};
                if (!student?.socialLinks?.linkedin && parsedData.personal_info.linkedin) {
                    socialUpdates["socialLinks.linkedin"] = parsedData.personal_info.linkedin;
                }
                if (!student?.socialLinks?.github && parsedData.personal_info.github) {
                    socialUpdates["socialLinks.github"] = parsedData.personal_info.github;
                }
                if (!student?.portfolio?.url && parsedData.personal_info.portfolio) {
                    socialUpdates["portfolio.url"] = parsedData.personal_info.portfolio;
                    socialUpdates["socialLinks.website"] = parsedData.personal_info.portfolio;
                }
                if (!student?.bio && parsedData.summary) {
                    socialUpdates.bio = parsedData.summary;
                }
                if (Object.keys(socialUpdates).length > 0) {
                    await Student.findByIdAndUpdate(req.user.id, { $set: socialUpdates });
                }
            }

            // F. Store Achievements in Student table
            if (Array.isArray(parsedData.achievements) && parsedData.achievements.length > 0) {
                const currentStudent = await Student.findById(req.user.id).select("achievements").lean();
                const existingRecords = (currentStudent?.achievements || []).slice(0, 250).map(a => {
                    const parsedYear = parseInt(a.year, 10);
                    return {
                        title: a.title ? String(a.title).trim().substring(0, 300) : null,
                        description: a.description ? String(a.description).trim().substring(0, 10000) : null,
                        year: (!isNaN(parsedYear) && parsedYear >= 1900 && parsedYear <= 2100) ? parsedYear : null
                    };
                });

                const newAchievements = [];
                for (const item of parsedData.achievements) {
                    let title = null;
                    let description = null;
                    let year = null;

                    if (typeof item === "string") {
                        title = item.trim().substring(0, 300) || null;
                        const yearMatch = item.match(/\b(19\d\d|20\d\d)\b/);
                        if (yearMatch) {
                            const y = parseInt(yearMatch[0], 10);
                            if (y >= 1900 && y <= 2100) year = y;
                        }
                    } else if (item && typeof item === "object") {
                        title = (item.title || item.name || "").trim().substring(0, 300) || null;
                        description = (item.description || "").trim().substring(0, 10000) || null;
                        const y = parseInt(item.year, 10);
                        if (!isNaN(y) && y >= 1900 && y <= 2100) {
                            year = y;
                        }
                    }

                    if (!title) continue;

                    let isDuplicate = false;

                    // Call intelligence-service /duplicate-check
                    try {
                        const duplicatePayload = {
                            student_id: String(req.user.id),
                            type: "achievement",
                            data: {
                                title,
                                description,
                                year
                            },
                            existing_records: existingRecords
                        };

                        const dupRes = await fetch(`${INTELLIGENCE_SERVICE_URL}/duplicate-check`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(duplicatePayload)
                        });

                        if (dupRes.ok) {
                            const resData = await dupRes.json();
                            isDuplicate = Boolean(
                                resData.is_duplicate ??
                                resData.duplicate ??
                                resData.isDuplicate ??
                                resData.exists
                            );
                        } else {
                            console.warn("Intelligence service /duplicate-check returned status:", dupRes.status);
                            // Fallback: check exact title match in existing records
                            isDuplicate = existingRecords.some(
                                r => r.title && r.title.toLowerCase() === title.toLowerCase()
                            );
                        }
                    } catch (dupErr) {
                        console.warn("Failed to check duplicate via intelligence API, using fallback:", dupErr.message);
                        // Fallback: check exact title match in existing records
                        isDuplicate = existingRecords.some(
                            r => r.title && r.title.toLowerCase() === title.toLowerCase()
                        );
                    }

                    if (!isDuplicate) {
                        newAchievements.push({
                            title,
                            description: description || "",
                            year: year ? String(year) : ""
                        });
                        existingRecords.push({
                            title,
                            description,
                            year
                        });
                    }
                }

                if (newAchievements.length > 0) {
                    await Student.findByIdAndUpdate(req.user.id, {
                        $push: { achievements: { $each: newAchievements } }
                    });
                }
            }
        }

        // Save resume metadata (no fake/dummy KPI scores)
        const data = await Resume.findOneAndUpdate(
            { student: req.user.id },
            {
                student: req.user.id,
                fileName,
                originalName: file.name,
                fileUrl,
                uploadedAt: new Date()
            },
            {
                returnDocument: "after",
                upsert: true
            }
        );

        res.json({
            success: true,
            message: aiParsed
                ? "Resume uploaded and profile details parsed into database"
                : "Resume uploaded successfully",
            data,
            parsed: aiParsed
        });
    } catch (error) {
        console.error("uploadResume error:", error);
        res.status(500).json({
            success: false,
            message: "Resume upload failed"
        });
    }
};

// PORTFOLIO UPDATE
exports.updatePortfolio = async (req, res) => {
    try {
        const { portfolioUrl } = req.body;

        const [resume, student] = await Promise.all([
            Resume.findOneAndUpdate(
                { student: req.user.id },
                { student: req.user.id, portfolioUrl: portfolioUrl || "" },
                { returnDocument: "after", upsert: true }
            ),
            Student.findByIdAndUpdate(
                req.user.id,
                {
                    $set: {
                        "portfolio.url": portfolioUrl || "",
                        "socialLinks.website": portfolioUrl || ""
                    }
                },
                { new: true }
            )
        ]);

        res.json({
            success: true,
            message: "Portfolio URL saved successfully",
            data: {
                portfolioUrl: resume.portfolioUrl,
                studentPortfolio: student?.portfolio?.url
            }
        });
    } catch (error) {
        console.error("updatePortfolio error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update portfolio URL"
        });
    }
};

// ============================================================================
// >>> USER INTEGRATION HOOK FOR AI RESUME & JOB DESCRIPTION (JD) CHECKING <<<
// You will build the intelligence service API for this yourself later.
// Wire this controller to your future FastAPI endpoint in the marked area below.
// ============================================================================
exports.compareResumeWithJD = async (req, res) => {
    try {
        const { jobDescription, targetRole, useExistingResume } = req.body;

        if (!jobDescription || !jobDescription.trim()) {
            return res.status(400).json({
                success: false,
                message: "Please enter or paste a job description to compare"
            });
        }

        let resumeName = "NA";
        let resumeFileBuffer = null;

        const shouldUseExisting = useExistingResume === "true" || useExistingResume === true;

        if (shouldUseExisting) {
            const existingResume = await Resume.findOne({ student: req.user.id });
            if (!existingResume || !existingResume.fileName) {
                return res.status(400).json({
                    success: false,
                    message: "No existing resume found. Please upload a resume first or choose 'Upload a new CV'."
                });
            }
            resumeName = existingResume.originalName || existingResume.fileName || "NA";
            const existingPath = path.join(uploadDir, existingResume.fileName);
            if (fs.existsSync(existingPath)) {
                resumeFileBuffer = fs.readFileSync(existingPath);
            }
        } else if (req.files && req.files.resume) {
            const newFile = req.files.resume;
            resumeName = newFile.name || "NA";
            resumeFileBuffer = newFile.data;
        } else {
            return res.status(400).json({
                success: false,
                message: "Please select your existing resume or upload a new CV to compare with the JD"
            });
        }

        // ============================================================================
        // PLACEHOLDER: Connect your future AI Intelligence Service here:
        // Example:
        // const INTELLIGENCE_SERVICE_URL = (process.env.INTELLIGENCE_SERVICE_URL || "http://localhost:8000/api").replace(/\/+$/, "");
        // const aiResponse = await fetch(`${INTELLIGENCE_SERVICE_URL}/compare-resume-jd`, {
        //     method: "POST",
        //     headers: { "Content-Type": "application/json" },
        //     body: JSON.stringify({
        //         job_description: jobDescription,
        //         target_role: targetRole || "NA",
        //     })
        // });
        // const aiResult = await aiResponse.json();
        // ============================================================================

        // Default response structure ready for user's AI intelligence integration:
        return res.json({
            success: true,
            isPlaceholder: true,
            message: "Resume & Job Description matched successfully (Ready for AI Intelligence Service integration)",
            data: {
                targetRole: targetRole || "NA",
                resumeAnalyzed: resumeName,
                matchScore: 84,
                matchingSkills: [
                    "Full-Stack Development",
                    "React.js & Frontend Architecture",
                    "RESTful APIs",
                    "Database Schema Design",
                    "Git Version Control",
                    "Team Collaboration"
                ],
                missingSkills: [
                    "Docker & Containerization",
                    "CI/CD Pipelines",
                    "AWS / Cloud Deployment",
                    "System Design & Scalability"
                ],
                recommendations: [
                    "Include quantifiable impact in your project bullets (e.g., 'reduced API response times by 35%').",
                    "Highlight cloud exposure and automated testing frameworks mentioned in the JD.",
                    "Tailor your profile summary to match key terms from the job requirements."
                ],
                summary: "Strong candidate match for technical problem solving and core stack. Addressing 2-3 DevOps skill gaps will substantially increase interview callback rate."
            }
        });
    } catch (error) {
        console.error("compareResumeWithJD error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to compare resume with job description"
        });
    }
};
