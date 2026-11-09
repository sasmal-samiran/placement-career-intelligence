const express = require("express");
const controller = require("../controllers/mentor");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth);
router.get("/", controller.getConversation);
router.post("/messages", controller.sendMessage);

module.exports = router;