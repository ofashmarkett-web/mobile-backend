const express = require("express");
const {
  sendOtpHandler,
  registerHandler,
  verifyOtpHandler,
  switchRoleHandler,
  handleDojahWebhook,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/otp-send", sendOtpHandler);
router.post("/otp-verify", verifyOtpHandler);
router.post("/register", registerHandler);
router.post("/switch-role", protect, switchRoleHandler);
router.post("/dojah-webhook", handleDojahWebhook);

module.exports = router;
