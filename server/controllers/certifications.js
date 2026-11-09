const path = require("path");
const fs = require("fs");
const Certification = require("../models/Certification");

const INTELLIGENCE_SERVICE_URL = (process.env.INTELLIGENCE_SERVICE_URL || "http://localhost:8000/api").replace(/\/+$/, "");

const certUploadDir = path.join(__dirname, "..", "uploads", "certificates");
if (!fs.existsSync(certUploadDir)) {
    fs.mkdirSync(certUploadDir, { recursive: true });
}

const certificationFields = [
    "name",
    "issuer",
    "issueDate",
    "year",
    "certificate"
];

const pickCertificationFields = body => Object.fromEntries(
    certificationFields
        .filter(field => body[field] !== undefined)
        .map(field => [field, body[field]])
);

function sanitizeCertificationRecord(item) {
    const name = item.name ? String(item.name).trim().substring(0, 300) : null;
    const issuer = item.issuer ? String(item.issuer).trim().substring(0, 300) : null;
    let year = null;
    if (item.year) {
        const y = parseInt(item.year, 10);
        if (!isNaN(y) && y >= 1900 && y <= 2100) year = y;
    }
    const issue_date = item.issueDate ? String(item.issueDate).trim().slice(0, 50) : null;

    return {
        name,
        issuer,
        issue_date,
        year
    };
}

// Call intelligence-service /duplicate-check for certification
async function checkCertificationDuplicate(studentId, certData, existingRecords) {
    try {
        const payload = {
            student_id: String(studentId),
            type: "certification",
            data: sanitizeCertificationRecord(certData),
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
            const targetName = (certData.name || "").toLowerCase().trim();
            const targetIssuer = (certData.issuer || "").toLowerCase().trim();
            const isDup = existingRecords.some(r => {
                if (!r.name) return false;
                const rName = r.name.toLowerCase().trim();
                const rIssuer = (r.issuer || "").toLowerCase().trim();
                if (targetIssuer && rIssuer) {
                    return rName === targetName && rIssuer === targetIssuer;
                }
                return rName === targetName;
            });
            return { is_duplicate: isDup, similarity: isDup ? 100 : 0 };
        }
    } catch (err) {
        console.warn("Intelligence service duplicate-check failed, fallback to match:", err.message);
        const targetName = (certData.name || "").toLowerCase().trim();
        const targetIssuer = (certData.issuer || "").toLowerCase().trim();
        const isDup = existingRecords.some(r => {
            if (!r.name) return false;
            const rName = r.name.toLowerCase().trim();
            const rIssuer = (r.issuer || "").toLowerCase().trim();
            if (targetIssuer && rIssuer) {
                return rName === targetName && rIssuer === targetIssuer;
            }
            return rName === targetName;
        });
        return { is_duplicate: isDup, similarity: isDup ? 100 : 0 };
    }
}

// GET ALL CERTIFICATIONS
exports.getCertifications = async (req, res) => {
    try {
        const data = await Certification.find({
            student: req.user.id
        }).sort({
            createdAt: -1
        });

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("getCertifications error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch certifications"
        });
    }
};

// CREATE A NEW CERTIFICATION
exports.createCertification = async (req, res) => {
    try {
        const name = (req.body.name || "").trim();

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Certification name is required"
            });
        }

        const issuer = (req.body.issuer || "").trim();
        const issueDate = (req.body.issueDate || "").trim();
        const year = (req.body.year || "").trim();
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

        // Validation logic: must have certificate file
        const validated = Boolean(certificate && certificate.trim());

        // Check duplicate certification before storing
        const existingCerts = await Certification.find({ student: req.user.id })
            .select("name issuer issueDate year")
            .lean();

        const existingRecords = existingCerts.slice(0, 250).map(sanitizeCertificationRecord);

        const dupResult = await checkCertificationDuplicate(
            req.user.id,
            { name, issuer, issueDate, year },
            existingRecords
        );

        if (dupResult.is_duplicate) {
            return res.status(409).json({
                success: false,
                is_duplicate: true,
                similarity: dupResult.similarity,
                message: `A certification with similar details already exists in your profile (${dupResult.similarity}% similarity).`
            });
        }

        const data = await Certification.create({
            ...pickCertificationFields(req.body),
            name,
            issuer,
            issueDate,
            year,
            certificate,
            validated,
            student: req.user.id
        });

        res.status(201).json({
            success: true,
            message: "Certification added",
            data
        });
    } catch (error) {
        console.error("createCertification error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to add certification"
        });
    }
};

// UPDATE A CERTIFICATION
exports.updateCertification = async (req, res) => {
    try {
        const updateData = pickCertificationFields(req.body);

        // Handle uploaded certificate file
        if (req.files && (req.files.certificate || req.files.certFile || req.files.file)) {
            const certFile = req.files.certificate || req.files.certFile || req.files.file;
            const safeName = certFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const fileName = `${Date.now()}_${safeName}`;
            const filePath = path.join(certUploadDir, fileName);
            await certFile.mv(filePath);
            updateData.certificate = `/uploads/certificates/${fileName}`;
        }

        const existing = await Certification.findOne({
            _id: req.params.id,
            student: req.user.id
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Certification not found"
            });
        }

        // If name or issuer is updated, verify no duplicate among other certifications
        if (updateData.name || updateData.issuer) {
            const otherCerts = await Certification.find({
                student: req.user.id,
                _id: { $ne: req.params.id }
            }).select("name issuer issueDate year").lean();

            const otherRecords = otherCerts.slice(0, 250).map(sanitizeCertificationRecord);

            const effectiveName = updateData.name !== undefined ? updateData.name : existing.name;
            const effectiveIssuer = updateData.issuer !== undefined ? updateData.issuer : existing.issuer;
            const effectiveIssueDate = updateData.issueDate !== undefined ? updateData.issueDate : existing.issueDate;
            const effectiveYear = updateData.year !== undefined ? updateData.year : existing.year;

            const dupResult = await checkCertificationDuplicate(
                req.user.id,
                {
                    name: effectiveName,
                    issuer: effectiveIssuer,
                    issueDate: effectiveIssueDate,
                    year: effectiveYear
                },
                otherRecords
            );

            if (dupResult.is_duplicate) {
                return res.status(409).json({
                    success: false,
                    is_duplicate: true,
                    similarity: dupResult.similarity,
                    message: `Another certification with similar details already exists in your profile (${dupResult.similarity}% similarity).`
                });
            }
        }

        const effectiveCertificate = updateData.certificate !== undefined ? updateData.certificate : existing.certificate;
        updateData.validated = Boolean(effectiveCertificate && effectiveCertificate.trim());

        const data = await Certification.findOneAndUpdate(
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
            message: "Certification updated",
            data
        });
    } catch (error) {
        console.error("updateCertification error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to update certification"
        });
    }
};

// DELETE A CERTIFICATION
exports.deleteCertification = async (req, res) => {
    try {
        const data = await Certification.findOneAndDelete({
            _id: req.params.id,
            student: req.user.id
        });

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Certification not found"
            });
        }

        res.json({
            success: true,
            message: "Certification deleted"
        });
    } catch (error) {
        console.error("deleteCertification error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to delete certification"
        });
    }
};

// BULK REPLACE CERTIFICATIONS (backward compatibility)
exports.replaceCertifications = async (req, res) => {
    try {
        if (!Array.isArray(req.body.certifications)) {
            return res.status(400).json({
                success: false,
                message: "Certifications must be an array"
            });
        }

        const certifications = req.body.certifications
            .filter(item => typeof item.name === "string" && item.name.trim())
            .map(item => {
                const cert = item.certificate || "";
                const validated = Boolean(cert && cert.trim());
                return {
                    ...pickCertificationFields(item),
                    name: item.name.trim(),
                    certificate: cert,
                    validated,
                    student: req.user.id
                };
            });

        await Certification.deleteMany({ student: req.user.id });
        const data = certifications.length
            ? await Certification.insertMany(certifications)
            : [];

        res.json({
            success: true,
            message: "Certifications updated",
            data
        });
    } catch (error) {
        console.error("replaceCertifications error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to replace certifications"
        });
    }
};
