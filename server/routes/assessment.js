const express = require("express");
const router = express.Router();
const controller = require("../controllers/assessment");
const auth = require("../middleware/auth");

// All assessment routes are authenticated
router.use(auth);

// Assessment catalog & active session management
router.get("/catalog", controller.getCatalog);
router.get("/active-session", controller.getActiveSession);
router.post("/start", controller.startSession);
router.post("/save-draft", controller.saveDraft);

// Submission & results
router.post("/submit", controller.submitAssessment);
router.get("/history", controller.getHistory);
router.get("/profile", controller.getLatestProfile);

// Legacy questions endpoint
router.get("/questions", controller.getQuestions);

module.exports = router;
