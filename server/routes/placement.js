const express = require("express");
const controller = require("../controllers/placement");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth);
router.get("/", controller.getPrediction);
router.post("/", controller.createPrediction);

module.exports = router;