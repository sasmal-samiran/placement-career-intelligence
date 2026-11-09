const express = require("express");

const router =
    express.Router();

const controller =
    require("../controllers/internships");

const auth =
    require("../middleware/auth");


router.use(auth);


router.get(
    "/",
    controller.getInternships
);

router.post(
    "/",
    controller.createInternship
);

router.put(
    "/:id",
    controller.updateInternship
);

router.delete(
    "/:id",
    controller.deleteInternship
);


module.exports = router;