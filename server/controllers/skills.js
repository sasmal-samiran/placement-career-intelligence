const Skill = require("../models/Skill");


exports.getSkills = async (req, res) => {

    const data =
        await Skill.findOne({

            student:
                req.user.id

        });


    res.json({

        success: true,

        data: data || {
            skills: []
        }

    });
};


exports.updateSkills = async (req, res) => {

    const skills = Array.isArray(req.body.skills)
        ? req.body.skills.map(skill => ({
            name: skill.name,
            level: skill.level ?? 50,
            category: skill.category ?? skill.cat ?? "Other",
            cat: skill.cat ?? skill.category ?? "Other"
        }))
        : [];

    const data =
        await Skill.findOneAndUpdate(

            {
                student:
                    req.user.id
            },

            {

                student:
                    req.user.id,

                skills

            },

            {
                returnDocument: "after",
                upsert: true
            }

        );


    res.json({

        success: true,

        message:
            "Skills updated",

        data

    });
};


exports.addSkill = async (req, res) => {

    let data =
        await Skill.findOne({

            student:
                req.user.id

        });


    if (!data) {

        data =
            new Skill({

                student:
                    req.user.id,

                skills: []

            });
    }


    data.skills.push({

        name:
            req.body.name,

        level:
            req.body.level || 50,

        category:
            req.body.category || req.body.cat || "Other",

        cat:
            req.body.cat || req.body.category || "Other"

    });


    await data.save();


    res.status(201).json({

        success: true,

        message:
            "Skill added",

        data

    });
};


exports.deleteSkill = async (req, res) => {
    const data = await Skill.findOneAndUpdate(
        {
            student: req.user.id,
            "skills._id": req.params.id
        },
        {
            $pull: {
                skills: {
                    _id: req.params.id
                }
            }
        },
        {
            returnDocument: "after"
        }
    );

    if (!data) {
        return res.status(404).json({
            success: false,
            message: "Skill not found"
        });
    }

    res.json({
        success: true,
        message: "Skill deleted",
        data
    });
};