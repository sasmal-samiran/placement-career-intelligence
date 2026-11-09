const express = require("express");
const router = express.Router();
const controller = require("../controllers/skills");
const auth = require("../middleware/auth");

router.use(auth);

router.get("/check", controller.checkSkillExists);
router.post("/check", controller.checkSkillExists);
router.get("/", controller.getSkills);
router.put("/", controller.updateSkills);
router.post("/", controller.addSkill);
router.delete("/:id", controller.deleteSkill);
router.post("/test-paper", controller.getTestPaper);
router.get("/test-paper", controller.getTestPaper);

module.exports = router;
