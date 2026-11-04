const Internship =
    require("../models/Internship");

const internshipFields = [
    "company",
    "role",
    "description",
    "startDate",
    "endDate",
    "date",
    "status",
    "skills"
];

const pickInternshipFields = body => Object.fromEntries(
    internshipFields
        .filter(field => body[field] !== undefined)
        .map(field => [field, body[field]])
);


exports.getInternships =
    async (req, res) => {

        const data =
            await Internship.find({

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


exports.createInternship =
    async (req, res) => {

        const data =
            await Internship.create({

                ...pickInternshipFields(req.body),

                student:
                    req.user.id

            });


        res.status(201).json({

            success: true,

            message:
                "Internship added",

            data

        });
    };


exports.updateInternship =
    async (req, res) => {

        const data =
            await Internship.findOneAndUpdate(

                {
                    _id:
                        req.params.id,

                    student:
                        req.user.id
                },

                pickInternshipFields(req.body),

                {
                    returnDocument: "after"
                }

            );

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Internship not found"
            });
        }


        res.json({

            success: true,

            message:
                "Internship updated",

            data

        });
    };


exports.deleteInternship =
    async (req, res) => {

        const data = await Internship.findOneAndDelete({

            _id:
                req.params.id,

            student:
                req.user.id

        });

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Internship not found"
            });
        }


        res.json({

            success: true,

            message:
                "Internship deleted"

        });
    };