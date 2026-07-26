const Order = require("../models/Order");
const Review = require("../models/Review");

const httpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const serializeReview = (review) => ({
  id: review.id,
  orderId: review.orderId,
  vendorId: review.vendorId,
  buyerId: review.buyerId,
  productId: review.productId,
  rating: review.rating,
  comment: review.comment,
  images: review.images || [],
  createdAt: review.createdAt,
});

// Buyer reviews a completed order. Vendor/product are derived from the order
// itself so a review can never be pinned to someone else's listing.
const createReview = async (req, res, next) => {
  try {
    const { orderId, rating, comment, images } = req.body;

    if (!orderId) throw httpError(400, "orderId is required");

    const stars = parseInt(rating, 10);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      throw httpError(400, "Rating must be between 1 and 5 stars");
    }

    const order = await Order.findByPk(orderId);

    if (!order) throw httpError(404, "Order not found");
    if (order.buyerId !== req.user.id) {
      throw httpError(403, "You can only review your own orders");
    }
    if (order.status !== "completed") {
      throw httpError(409, "You can leave a review once the order is completed");
    }

    const existing = await Review.findOne({ where: { orderId: order.id } });
    if (existing) throw httpError(409, "You've already reviewed this order");

    const review = await Review.create({
      orderId: order.id,
      vendorId: order.vendorId,
      buyerId: req.user.id,
      productId: order.productId,
      rating: stars,
      comment: comment && String(comment).trim() ? String(comment).trim() : null,
      images: Array.isArray(images) ? images : [],
    });

    return res.status(201).json({ success: true, review: serializeReview(review) });
  } catch (error) {
    return next(error);
  }
};

// The buyer's reviewed orderIds — drives the "Ready for review" bucket in the
// app (completed orders not in this list).
const listMyReviewedOrders = async (req, res, next) => {
  try {
    const reviews = await Review.findAll({
      where: { buyerId: req.user.id },
      attributes: ["orderId"],
      raw: true,
    });

    return res.status(200).json({
      success: true,
      orderIds: reviews.map((review) => review.orderId).filter(Boolean),
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { createReview, listMyReviewedOrders };
