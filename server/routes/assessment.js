const express = require("express");
const router = express.Router();
const controller = require("../controllers/assessment");
const auth = require("../middleware/auth");

router.use(auth);

router.get("/questions", controller.getQuestions);
router.post("/submit", controller.submitAssessment);
router.get("/history", controller.getHistory);
router.get("/profile", controller.getLatestProfile);

module.exports = router;

