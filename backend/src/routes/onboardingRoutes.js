const express = require("express");
const {
  saveBuyerOnboarding,
  saveVendorOnboarding,
  saveRiderOnboarding,
  submitOnboarding,
  getOnboardingStatus,
  startKycCheck,
  handleDojahOnboardingWebhook,
} = require("../controllers/onboardingController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/buyer", protect, saveBuyerOnboarding);
router.post("/vendor", protect, saveVendorOnboarding);
router.post("/rider", protect, saveRiderOnboarding);
router.get("/:role/status", protect, getOnboardingStatus);
router.post("/:role/submit", protect, submitOnboarding);
router.post("/:role/kyc/:check", protect, startKycCheck);
router.post("/dojah/webhook", handleDojahOnboardingWebhook);

module.exports = router;
