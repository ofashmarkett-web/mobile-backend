const { Router } = require("express");
const { protect } = require("../middleware/auth");
const {
  requireRole,
  attachVendorProfile,
  requireVerifiedVendor,
} = require("../middleware/roleCheck");
const vendorController = require("../controllers/vendorController");

const router = Router();

// Store info stays readable while verification is pending so the app can show
// the correct "awaiting verification" state; everything else needs a verified vendor.
router.get("/me/store", protect, requireRole("vendor"), attachVendorProfile, vendorController.getMyStore);
router.patch("/me/store", protect, requireRole("vendor"), requireVerifiedVendor, vendorController.updateMyStore);
router.get("/me/home", protect, requireRole("vendor"), requireVerifiedVendor, vendorController.getMyHome);
router.get("/me/analytics", protect, requireRole("vendor"), requireVerifiedVendor, vendorController.getMyAnalytics);
router.get("/me/reviews", protect, requireRole("vendor"), requireVerifiedVendor, vendorController.getMyReviews);

// Notifications and personal info stay readable while verification is pending,
// like /me/store — they only surface the vendor's own data.
router.get("/me/notifications", protect, requireRole("vendor"), attachVendorProfile, vendorController.getMyNotifications);
router.get("/me/personal", protect, requireRole("vendor"), attachVendorProfile, vendorController.getMyPersonal);
router.patch("/me/personal", protect, requireRole("vendor"), attachVendorProfile, vendorController.updateMyPersonal);

module.exports = router;
