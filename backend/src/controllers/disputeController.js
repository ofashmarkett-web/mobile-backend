const { Op } = require("sequelize");
const Dispute = require("../models/Dispute");
const Order = require("../models/Order");
const User = require("../models/User");
const BuyerProfile = require("../models/BuyerProfile");

const DISPUTE_REASONS = [
  "Item damaged",
  "Wrong item",
  "Not as described",
  "Size / fit issue",
];

const httpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const buyerInclude = {
  model: User,
  as: "buyer",
  attributes: ["id", "email"],
  include: [{ model: BuyerProfile, as: "buyerProfile", attributes: ["fullName"] }],
};

const buyerNameOf = (buyer) =>
  buyer?.buyerProfile?.fullName || buyer?.email?.split("@")[0] || "Buyer";

const serializeDispute = (dispute) => ({
  id: dispute.id,
  orderId: dispute.orderId,
  vendorId: dispute.vendorId,
  buyerId: dispute.buyerId,
  reason: dispute.reason,
  detail: dispute.detail,
  evidenceImages: dispute.evidenceImages || [],
  amountHeld: dispute.amountHeld,
  status: dispute.status,
  resolutionNote: dispute.resolutionNote,
  resolvedAt: dispute.resolvedAt,
  createdAt: dispute.createdAt,
});

// Buyer raises a dispute on a delivered (not yet completed) order. This
// freezes the escrow: see the guard in orderController.releaseDueEscrows.
const createDispute = async (req, res, next) => {
  try {
    const { orderId, reason, detail, evidenceImages } = req.body;

    if (!orderId) throw httpError(400, "orderId is required");
    if (!DISPUTE_REASONS.includes(reason)) {
      throw httpError(400, `Reason must be one of: ${DISPUTE_REASONS.join(", ")}`);
    }
    if (!detail || !String(detail).trim()) {
      throw httpError(400, "Tell us what happened so the vendor can respond");
    }

    const order = await Order.findByPk(orderId);

    if (!order) throw httpError(404, "Order not found");
    if (order.buyerId !== req.user.id) {
      throw httpError(403, "You can only dispute your own orders");
    }
    if (order.status !== "delivered") {
      throw httpError(409, "A dispute can only be raised after delivery, before the order completes");
    }

    const existing = await Dispute.findOne({ where: { orderId: order.id } });
    if (existing) throw httpError(409, "A dispute already exists for this order");

    const dispute = await Dispute.create({
      orderId: order.id,
      vendorId: order.vendorId,
      buyerId: req.user.id,
      reason,
      detail: String(detail).trim(),
      evidenceImages: Array.isArray(evidenceImages) ? evidenceImages : [],
      amountHeld: order.orderAmount,
    });

    return res.status(201).json({ success: true, dispute: serializeDispute(dispute) });
  } catch (error) {
    return next(error);
  }
};

// Vendor's dispute list, enriched with product + buyer info from the order.
const listVendorDisputes = async (req, res, next) => {
  try {
    const state = req.query.state === "resolved" ? "resolved" : "active";
    const statusWhere =
      state === "resolved" ? "resolved" : { [Op.in]: ["submitted", "under_review"] };

    const disputes = await Dispute.findAll({
      where: { vendorId: req.user.id, status: statusWhere },
      order: [["created_at", "DESC"]],
      include: [
        {
          model: Order,
          as: "order",
          attributes: ["id", "orderNo", "productName", "productImageUrl", "createdAt"],
          include: [buyerInclude],
        },
      ],
    });

    return res.status(200).json({
      success: true,
      disputes: disputes.map((dispute) => ({
        ...serializeDispute(dispute),
        productName: dispute.order?.productName || "Order item",
        productImageUrl: dispute.order?.productImageUrl || null,
        buyerName: buyerNameOf(dispute.order?.buyer),
      })),
    });
  } catch (error) {
    return next(error);
  }
};

const getDispute = async (req, res, next) => {
  try {
    const dispute = await Dispute.findByPk(req.params.id, {
      include: [
        {
          model: Order,
          as: "order",
          attributes: [
            "id",
            "orderNo",
            "productName",
            "productImageUrl",
            "size",
            "quantity",
            "createdAt",
          ],
          include: [buyerInclude],
        },
      ],
    });

    if (!dispute) throw httpError(404, "Dispute not found");
    if (dispute.vendorId !== req.user.id && dispute.buyerId !== req.user.id) {
      throw httpError(403, "You are not part of this dispute");
    }

    return res.status(200).json({
      success: true,
      dispute: {
        ...serializeDispute(dispute),
        buyerName: buyerNameOf(dispute.order?.buyer),
        order: dispute.order
          ? {
              orderNo: dispute.order.orderNo,
              createdAt: dispute.order.createdAt,
              productName: dispute.order.productName,
              productImageUrl: dispute.order.productImageUrl,
              size: dispute.order.size,
              quantity: dispute.order.quantity,
            }
          : null,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { createDispute, listVendorDisputes, getDispute, DISPUTE_REASONS };
