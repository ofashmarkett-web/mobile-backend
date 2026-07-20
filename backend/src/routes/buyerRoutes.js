const { Router } = require("express");
const { protect } = require("../middleware/auth");
const { requireRole } = require("../middleware/roleCheck");
const buyerController = require("../controllers/buyerController");

const router = Router();

router.get("/me", protect, requireRole("buyer"), buyerController.getMyProfile);
router.patch("/me", protect, requireRole("buyer"), buyerController.updateMyProfile);

// Marketplace browsing — any signed-in user can look around.
router.get("/marketplace/products", protect, buyerController.browseProducts);
router.get("/marketplace/products/:id", protect, buyerController.getBuyerProduct);
router.get("/marketplace/vendors", protect, buyerController.recommendedVendors);

module.exports = router;
