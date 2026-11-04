const express = require("express");

const router =
    express.Router();

const controller =
    require("../controllers/attendance");

const auth =
    require("../middleware/auth");


router.use(auth);


router.get(
    "/",
    controller.getAttendance
);

router.put(
    "/",
    controller.updateAttendance
);


module.exports = router;