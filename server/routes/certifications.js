const express = require("express");

const router =
    express.Router();

const controller =
    require("../controllers/certifications");

const auth =
    require("../middleware/auth");


router.use(auth);


router.get(
    "/",
    controller.getCertifications
);

router.post(
    "/",
    controller.createCertification
);

router.put(
    "/",
    controller.replaceCertifications
);

router.put(
    "/:id",
    controller.updateCertification
);

router.delete(
    "/:id",
    controller.deleteCertification
);


module.exports = router;