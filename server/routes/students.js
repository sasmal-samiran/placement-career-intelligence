const express = require("express");
const router = express.Router();
const controller = require("../controllers/students");
const auth = require("../middleware/auth");

router.use(auth);

router.delete("/achievements/:id", controller.deleteAchievement);
router.get("/profile", controller.getProfile);
router.put("/profile", controller.updateProfile);
router.delete("/profile", controller.deleteAccount);
router.delete("/account", controller.deleteAccount);

module.exports = router;
