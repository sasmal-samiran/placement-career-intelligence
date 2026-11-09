const express = require("express");
const controller = require("../controllers/dashboard");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth);
router.get("/", controller.getDashboard);

module.exports = router;