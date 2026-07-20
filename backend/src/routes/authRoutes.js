const express = require("express");
const {
  sendOtpHandler,
  registerHandler,
  verifyOtpHandler,
  handleDojahWebhook,
} = require("../controllers/authController");

const router = express.Router();

router.post("/otp-send", sendOtpHandler);
router.post("/otp-verify", verifyOtpHandler);
router.post("/register", registerHandler);
router.post("/dojah-webhook", handleDojahWebhook);

module.exports = router;
