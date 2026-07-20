const { Router } = require("express");
const { protect } = require("../middleware/auth");
const { requireRole, requireVerifiedVendor } = require("../middleware/roleCheck");
const orderController = require("../controllers/orderController");

const router = Router();

const vendorOnly = [protect, requireRole("vendor"), requireVerifiedVendor];

router.get("/vendor", ...vendorOnly, orderController.listVendorOrders);
router.get("/buyer", protect, requireRole("buyer"), orderController.listBuyerOrders);
router.post("/", protect, requireRole("buyer"), orderController.createOrder);
router.get("/:id", protect, orderController.getOrder);

// Vendor lifecycle actions
router.post("/:id/accept", ...vendorOnly, orderController.acceptOrder);
router.post("/:id/decline", ...vendorOnly, orderController.declineOrder);
router.post("/:id/ready", ...vendorOnly, orderController.markReadyForPickup);
router.post("/:id/cancel-ready", ...vendorOnly, orderController.cancelReadyForPickup);

// Rider lifecycle actions
router.post("/:id/pickup", protect, requireRole("rider"), orderController.confirmPickup);
router.post("/:id/delivered", protect, requireRole("rider"), orderController.markDelivered);

// Buyer confirms receipt
router.post("/:id/confirm", protect, requireRole("buyer"), orderController.confirmDelivery);

module.exports = router;
