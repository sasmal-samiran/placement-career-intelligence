const Certification =
    require("../models/Certification");

const certificationFields = [
    "name",
    "issuer",
    "issueDate",
    "year",
    "icon",
    "credentialId",
    "credentialUrl"
];

const pickCertificationFields = body => Object.fromEntries(
    certificationFields
        .filter(field => body[field] !== undefined)
        .map(field => [field, body[field]])
);


exports.getCertifications =
    async (req, res) => {

        const data =
            await Certification.find({

                student:
                    req.user.id

            }).sort({
                createdAt: -1
            });


        res.json({

            success: true,

            data

        });
    };


exports.createCertification =
    async (req, res) => {

        const data =
            await Certification.create({

                ...pickCertificationFields(req.body),

                student:
                    req.user.id

            });


        res.status(201).json({

            success: true,

            message:
                "Certification added",

            data

        });
    };


exports.updateCertification =
    async (req, res) => {

        const data =
            await Certification.findOneAndUpdate(

                {
                    _id:
                        req.params.id,

                    student:
                        req.user.id
                },

                pickCertificationFields(req.body),

                {
                    returnDocument: "after"
                }

            );

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Certification not found"
            });
        }


        res.json({

            success: true,

            message:
                "Certification updated",

            data

        });
    };


exports.deleteCertification =
    async (req, res) => {

        const data = await Certification.findOneAndDelete({

            _id:
                req.params.id,

            student:
                req.user.id

        });

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Certification not found"
            });
        }


        res.json({

            success: true,

            message:
                "Certification deleted"

        });
    };

exports.replaceCertifications = async (req, res) => {
    if (!Array.isArray(req.body.certifications)) {
        return res.status(400).json({
            success: false,
            message: "Certifications must be an array"
        });
    }

    const certifications = req.body.certifications
        .filter(item => typeof item.name === "string" && item.name.trim())
        .map(item => ({
            ...pickCertificationFields(item),
            name: item.name.trim(),
            student: req.user.id
        }));

    await Certification.deleteMany({ student: req.user.id });
    const data = certifications.length
        ? await Certification.insertMany(certifications)
        : [];

    res.json({
        success: true,
        message: "Certifications updated",
        data
    });
};