const Coding =
    require("../models/Coding");


exports.getCoding =
    async (req, res) => {

        const data =
            await Coding.findOne({

                student:
                    req.user.id

            });


        res.json({

            success: true,

            data: data || {
                profiles: []
            }

        });
    };


exports.updateCoding =
    async (req, res) => {

        const data =
            await Coding.findOneAndUpdate(

                {
                    student:
                        req.user.id
                },

                {

                    student:
                        req.user.id,

                    profiles:
                        req.body.profiles || []

                },

                {
                    returnDocument: "after",
                    upsert: true
                }

            );


        res.json({

            success: true,

            message:
                "Coding profiles updated",

            data

        });
    };