const Resume =
    require("../models/Resume");

const path =
    require("path");

const fs =
    require("fs");


const uploadDir =
    path.join(
        __dirname,
        "..",
        "uploads",
        "resumes"
    );


if (!fs.existsSync(uploadDir)) {

    fs.mkdirSync(
        uploadDir,
        {
            recursive: true
        }
    );
}


// GET RESUME

exports.getResume =
    async (req, res) => {

        const data =
            await Resume.findOne({

                student:
                    req.user.id

            });


        res.json({

            success: true,

            data

        });
    };


// UPLOAD RESUME

exports.uploadResume =
    async (req, res) => {

        try {

            if (
                !req.files ||
                !req.files.resume
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please select a resume"

                });
            }


            const file =
                req.files.resume;


            if (
                file.mimetype !==
                    "application/pdf" &&
                file.mimetype !==
                    "application/msword" &&
                file.mimetype !==
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Only PDF, DOC and DOCX files allowed"

                });
            }


            if (
                file.size >
                5 * 1024 * 1024
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Maximum file size is 5MB"

                });
            }


            const safeName =
                file.name.replace(
                    /[^a-zA-Z0-9._-]/g,
                    "_"
                );


            const fileName =
                Date.now() +
                "_" +
                safeName;


            const filePath =
                path.join(
                    uploadDir,
                    fileName
                );


            await file.mv(
                filePath
            );


            const fileUrl =
                `/uploads/resumes/${fileName}`;


            const data =
                await Resume.findOneAndUpdate(

                    {
                        student:
                            req.user.id
                    },

                    {

                        student:
                            req.user.id,

                        fileName,

                        originalName:
                            file.name,

                        fileUrl,

                        uploadedAt:
                            new Date()

                    },

                    {
                        returnDocument: "after",
                        upsert: true
                    }

                );


            res.json({

                success: true,

                message:
                    "Resume uploaded successfully",

                data

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "Resume upload failed"

            });
        }
    };


// PORTFOLIO

exports.updatePortfolio =
    async (req, res) => {

        const data =
            await Resume.findOneAndUpdate(

                {
                    student:
                        req.user.id
                },

                {

                    student:
                        req.user.id,

                    portfolioUrl:
                        req.body.portfolioUrl

                },

                {
                    returnDocument: "after",
                    upsert: true
                }

            );


        res.json({

            success: true,

            message:
                "Portfolio updated",

            data

        });
    };