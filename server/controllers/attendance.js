const Attendance =
    require("../models/Attendance");


exports.getAttendance =
    async (req, res) => {

        try {

            const data =
                await Attendance.findOne({

                    student:
                        req.user.id

                });


            res.json({

                success: true,

                data: data || {
                    subjects: []
                }

            });

        } catch (error) {

            res.status(500).json({

                success: false,

                message:
                    "Could not fetch attendance"

            });
        }
    };


exports.updateAttendance =
    async (req, res) => {

        try {

            const subjects =
                (Array.isArray(req.body.subjects) ? req.body.subjects : [])
                    .map(item => {

                        const total = Number(item.total || 0);

                        const present =
                            Number(
                                item.present || 0
                            );

                        const percentage =
                            total > 0
                                ? Number(
                                    (
                                        present /
                                        total *
                                        100
                                    ).toFixed(2)
                                )
                                : Number(item.percentage || 0);

                        return {

                            subject:
                                item.subject || item.name || "",

                            present,

                            total,

                            percentage

                        };

                    });


            const data =
                await Attendance.findOneAndUpdate(

                    {
                        student:
                            req.user.id
                    },

                    {

                        student:
                            req.user.id,

                        subjects

                    },

                    {
                        returnDocument: "after",
                        upsert: true
                    }

                );


            res.json({

                success: true,

                message:
                    "Attendance updated",

                data

            });

        } catch (error) {

            res.status(500).json({

                success: false,

                message:
                    "Attendance update failed"

            });
        }
    };