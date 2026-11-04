const express = require("express");

const router =
    express.Router();

const controller =
    require("../controllers/skills");

const auth =
    require("../middleware/auth");


router.use(auth);


router.get(
    "/",
    controller.getSkills
);

router.put(
    "/",
    controller.updateSkills
);

router.post(
    "/",
    controller.addSkill
);

router.delete(
    "/:id",
    controller.deleteSkill
);


module.exports = router;