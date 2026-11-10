const path = require("path");
const fs = require("fs");
const Internship = require("../models/Internship");

const INTELLIGENCE_SERVICE_URL = (process.env.INTELLIGENCE_SERVICE_URL || "http://localhost:8000/api").replace(/\/+$/, "");

const certUploadDir = path.join(__dirname, "..", "uploads", "certificates");
if (!fs.existsSync(certUploadDir)) {
    fs.mkdirSync(certUploadDir, { recursive: true });
}

const internshipFields = [
    "company",
    "role",
    "description",
    "startDate",
    "endDate",
    "date",
    "status",
    "certificate",
    "skills"
];

const pickInternshipFields = body => Object.fromEntries(
    internshipFields
        .filter(field => body[field] !== undefined)
        .map(field => [field, body[field]])
);

function formatIsoDate(dateStr) {
    if (!dateStr || typeof dateStr !== "string") return null;
    const clean = dateStr.trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
        const d = new Date(clean);
        if (!isNaN(d.getTime())) return clean;
    }
    return null;
}

function sanitizeInternshipRecord(item) {
    const company = item.company ? String(item.company).trim().substring(0, 300) : null;
    const role = item.role ? String(item.role).trim().substring(0, 300) : null;
    const description = item.description ? String(item.description).trim().substring(0, 10000) : null;
    let start_date = formatIsoDate(item.startDate || item.start_date);
    let end_date = formatIsoDate(item.endDate || item.end_date);

    // Enforce Pydantic validator constraint: start_date <= end_date
    if (start_date && end_date && start_date > end_date) {
        end_date = null;
    }

    return {
        company,
        role,
        description,
        start_date,
        end_date
    };
}

// Call intelligence-service /duplicate-check for internship
async function checkInternshipDuplicate(studentId, internshipData, existingRecords) {
    try {
        const payload = {
            student_id: String(studentId),
            type: "internship",
            data: sanitizeInternshipRecord(internshipData),
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
            const comp = (internshipData.company || "").toLowerCase();
            const rol = (internshipData.role || "").toLowerCase();
            const isDup = existingRecords.some(
                r => r.company && r.company.toLowerCase() === comp &&
                     r.role && r.role.toLowerCase() === rol
            );
            return { is_duplicate: isDup, similarity: isDup ? 100 : 0 };
        }
    } catch (err) {
        console.warn("Intelligence service duplicate-check failed, fallback to match:", err.message);
        const comp = (internshipData.company || "").toLowerCase();
        const rol = (internshipData.role || "").toLowerCase();
        const isDup = existingRecords.some(
            r => r.company && r.company.toLowerCase() === comp &&
                 r.role && r.role.toLowerCase() === rol
        );
        return { is_duplicate: isDup, similarity: isDup ? 100 : 0 };
    }
}

// GET ALL INTERNSHIPS FOR LOGGED-IN STUDENT
exports.getInternships = async (req, res) => {
    try {
        const data = await Internship.find({
            student: req.user.id
        }).sort({
            createdAt: -1
        });

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("getInternships error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch internships"
        });
    }
};

// CREATE A NEW INTERNSHIP
exports.createInternship = async (req, res) => {
    try {
        const company = (req.body.company || "").trim();
        const role = (req.body.role || "").trim();

        if (!company || !role) {
            return res.status(400).json({
                success: false,
                message: "Company and role are required fields"
            });
        }

        const description = (req.body.description || "").trim();
        const startDate = (req.body.startDate || "").trim();
        const endDate = (req.body.endDate || "").trim();
        let certificate = (req.body.certificate || req.body.certificateUrl || "").trim();

        // Handle uploaded certificate file
        if (req.files && (req.files.certificate || req.files.certFile || req.files.file)) {
            const certFile = req.files.certificate || req.files.certFile || req.files.file;
            const safeName = certFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const fileName = `${Date.now()}_${safeName}`;
            const filePath = path.join(certUploadDir, fileName);
            await certFile.mv(filePath);
            certificate = `/uploads/certificates/${fileName}`;
        }

        // Validation logic: must have internship certificate
        const validated = Boolean(certificate && certificate.trim());

        // Check duplicate internship before storing
        const existingInternships = await Internship.find({ student: req.user.id })
            .select("company role description startDate endDate")
            .lean();

        const existingRecords = existingInternships.slice(0, 250).map(sanitizeInternshipRecord);

        const dupResult = await checkInternshipDuplicate(
            req.user.id,
            { company, role, description, startDate, endDate },
            existingRecords
        );

        if (dupResult.is_duplicate) {
            return res.status(409).json({
                success: false,
                is_duplicate: true,
                similarity: dupResult.similarity,
                message: `An internship with similar details already exists in your profile (${dupResult.similarity}% similarity).`
            });
        }

        const data = await Internship.create({
            ...pickInternshipFields(req.body),
            company,
            role,
            description,
            startDate,
            endDate,
            certificate,
            validated,
            student: req.user.id
        });

        res.status(201).json({
            success: true,
            message: "Internship added",
            data
        });
    } catch (error) {
        console.error("createInternship error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to add internship"
        });
    }
};

// UPDATE AN INTERNSHIP
exports.updateInternship = async (req, res) => {
    try {
        const updateData = pickInternshipFields(req.body);

        // Handle uploaded certificate file
        if (req.files && (req.files.certificate || req.files.certFile || req.files.file)) {
            const certFile = req.files.certificate || req.files.certFile || req.files.file;
            const safeName = certFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const fileName = `${Date.now()}_${safeName}`;
            const filePath = path.join(certUploadDir, fileName);
            await certFile.mv(filePath);
            updateData.certificate = `/uploads/certificates/${fileName}`;
        }

        const existing = await Internship.findOne({
            _id: req.params.id,
            student: req.user.id
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Internship not found"
            });
        }

        // If company or role is being updated, verify no duplicate among other internships
        if (updateData.company || updateData.role) {
            const otherInternships = await Internship.find({
                student: req.user.id,
                _id: { $ne: req.params.id }
            }).select("company role description startDate endDate").lean();

            const otherRecords = otherInternships.slice(0, 250).map(sanitizeInternshipRecord);

            const effectiveCompany = updateData.company !== undefined ? updateData.company : existing.company;
            const effectiveRole = updateData.role !== undefined ? updateData.role : existing.role;
            const effectiveDesc = updateData.description !== undefined ? updateData.description : existing.description;
            const effectiveStart = updateData.startDate !== undefined ? updateData.startDate : existing.startDate;
            const effectiveEnd = updateData.endDate !== undefined ? updateData.endDate : existing.endDate;

            const dupResult = await checkInternshipDuplicate(
                req.user.id,
                {
                    company: effectiveCompany,
                    role: effectiveRole,
                    description: effectiveDesc,
                    startDate: effectiveStart,
                    endDate: effectiveEnd
                },
                otherRecords
            );

            if (dupResult.is_duplicate) {
                return res.status(409).json({
                    success: false,
                    is_duplicate: true,
                    similarity: dupResult.similarity,
                    message: `Another internship with similar details already exists in your profile (${dupResult.similarity}% similarity).`
                });
            }
        }

        const effectiveCertificate = updateData.certificate !== undefined ? updateData.certificate : existing.certificate;
        updateData.validated = Boolean(effectiveCertificate && effectiveCertificate.trim());

        const data = await Internship.findOneAndUpdate(
            {
                _id: req.params.id,
                student: req.user.id
            },
            updateData,
            {
                returnDocument: "after"
            }
        );

        res.json({
            success: true,
            message: "Internship updated",
            data
        });
    } catch (error) {
        console.error("updateInternship error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to update internship"
        });
    }
};

// DELETE AN INTERNSHIP
exports.deleteInternship = async (req, res) => {
    try {
        const data = await Internship.findOneAndDelete({
            _id: req.params.id,
            student: req.user.id
        });

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Internship not found"
            });
        }

        res.json({
            success: true,
            message: "Internship deleted"
        });
    } catch (error) {
        console.error("deleteInternship error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to delete internship"
        });
    }
};
