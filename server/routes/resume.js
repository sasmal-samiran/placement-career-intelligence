const express = require("express");
const router = express.Router();
const controller = require("../controllers/resume");
const auth = require("../middleware/auth");

router.use(auth);

router.get("/", controller.getResume);
router.post("/upload", controller.uploadResume);
router.put("/portfolio", controller.updatePortfolio);
router.post("/compare-jd", controller.compareResumeWithJD);

module.exports = router;