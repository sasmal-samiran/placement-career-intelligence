const express = require("express");

const router =
    express.Router();

const controller =
    require("../controllers/students");

const auth =
    require("../middleware/auth");


router.use(auth);


router.get(
    "/profile",
    controller.getProfile
);

router.put(
    "/profile",
    controller.updateProfile
);


module.exports = router;