const express = require("express");

const router =
    express.Router();

const controller =
    require("../controllers/coding");

const auth =
    require("../middleware/auth");


router.use(auth);


router.get(
    "/",
    controller.getCoding
);

router.put(
    "/",
    controller.updateCoding
);


module.exports = router;