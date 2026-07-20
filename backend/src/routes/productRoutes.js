const { Router } = require("express");
const { protect } = require("../middleware/auth");
const { requireRole, requireVerifiedVendor } = require("../middleware/roleCheck");
const productController = require("../controllers/productController");

const router = Router();

const vendorOnly = [protect, requireRole("vendor"), requireVerifiedVendor];

router.post("/", ...vendorOnly, productController.createProduct);
router.get("/mine", ...vendorOnly, productController.listMyProducts);
router.get("/:id", ...vendorOnly, productController.getMyProduct);
router.patch("/:id", ...vendorOnly, productController.updateProduct);
router.patch("/:id/stock", ...vendorOnly, productController.updateStock);
router.patch("/:id/status", ...vendorOnly, productController.setActiveStatus);
router.delete("/:id", ...vendorOnly, productController.deleteProduct);

// Public: buyers record real product views that power vendor insights.
router.post("/:id/view", productController.recordView);

module.exports = router;
