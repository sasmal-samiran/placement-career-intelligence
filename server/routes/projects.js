const express = require("express");

const router =
    express.Router();

const controller =
    require("../controllers/projects");

const auth =
    require("../middleware/auth");


router.use(auth);


router.get(
    "/",
    controller.getProjects
);

router.post(
    "/",
    controller.createProject
);

router.put(
    "/:id",
    controller.updateProject
);

router.delete(
    "/:id",
    controller.deleteProject
);


module.exports = router;