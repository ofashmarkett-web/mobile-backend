const { Router } = require("express");
const { protect } = require("../middleware/auth");
const { requireRole } = require("../middleware/roleCheck");
const reviewController = require("../controllers/reviewController");

const router = Router();

router.post("/", protect, requireRole("buyer"), reviewController.createReview);
router.get("/mine", protect, requireRole("buyer"), reviewController.listMyReviewedOrders);

module.exports = router;
