const express = require("express");

const router =
    express.Router();

const controller =
    require("../controllers/academic");

const auth =
    require("../middleware/auth");


router.use(auth);


router.get(
    "/",
    controller.getAcademic
);

router.put(
    "/",
    controller.updateAcademic
);


module.exports = router;