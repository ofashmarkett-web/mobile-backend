const { Router } = require("express");
const { protect } = require("../middleware/auth");
const { requireRole, requireVerifiedVendor } = require("../middleware/roleCheck");
const disputeController = require("../controllers/disputeController");

const router = Router();

router.post("/", protect, requireRole("buyer"), disputeController.createDispute);
router.get(
  "/vendor",
  protect,
  requireRole("vendor"),
  requireVerifiedVendor,
  disputeController.listVendorDisputes,
);
router.get("/:id", protect, disputeController.getDispute);

module.exports = router;
