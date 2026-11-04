const Project =
    require("../models/Project");

const projectFields = [
    "name",
    "description",
    "desc",
    "tech",
    "technologies",
    "githubUrl",
    "liveUrl",
    "status",
    "startDate",
    "endDate"
];

const pickProjectFields = body => Object.fromEntries(
    projectFields
        .filter(field => body[field] !== undefined)
        .map(field => [field, body[field]])
);


exports.getProjects =
    async (req, res) => {

        const data =
            await Project.find({

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


exports.createProject =
    async (req, res) => {

        const data =
            await Project.create({

                ...pickProjectFields(req.body),

                student:
                    req.user.id

            });


        res.status(201).json({

            success: true,

            message:
                "Project added",

            data

        });
    };


exports.updateProject =
    async (req, res) => {

        const data =
            await Project.findOneAndUpdate(

                {
                    _id:
                        req.params.id,

                    student:
                        req.user.id
                },

                pickProjectFields(req.body),

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

            message:
                "Project updated",

            data

        });
    };


exports.deleteProject =
    async (req, res) => {

        const data = await Project.findOneAndDelete({

            _id:
                req.params.id,

            student:
                req.user.id

        });

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }


        res.json({

            success: true,

            message:
                "Project deleted"

        });
    };