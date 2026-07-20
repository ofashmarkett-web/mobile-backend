const { Op } = require("sequelize");
const sequelize = require("../config/database");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const BuyerProfile = require("../models/BuyerProfile");
const Dispute = require("../models/Dispute");
const { generateCode, generateUniqueOrderNo } = require("../utils/generateUniqueCode");

const RELEASE_WINDOW_HOURS = Number(process.env.ESCROW_RELEASE_HOURS || 2);
const PLATFORM_FEE_PCT = Number(process.env.PLATFORM_FEE_PCT || 5);

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

const serializeOrder = (order) => ({
  id: order.id,
  orderNo: order.orderNo,
  productId: order.productId,
  productName: order.productName,
  productImageUrl: order.productImageUrl,
  size: order.size,
  quantity: order.quantity,
  unitPrice: order.unitPrice,
  orderAmount: order.orderAmount,
  platformFeePct: order.platformFeePct,
  platformFee: order.platformFee,
  vendorReceives: order.vendorReceives,
  status: order.status,
  escrowStatus: order.escrowStatus,
  pickupCode: order.pickupCode,
  deliveryAddress: order.deliveryAddress,
  buyerId: order.buyerId,
  buyerName:
    order.buyer?.buyerProfile?.fullName || order.buyer?.email?.split("@")[0] || "Buyer",
  acceptedAt: order.acceptedAt,
  packedAt: order.packedAt,
  pickedUpAt: order.pickedUpAt,
  deliveredAt: order.deliveredAt,
  autoReleaseAt: order.autoReleaseAt,
  completedAt: order.completedAt,
  createdAt: order.createdAt,
});

// Orders with an unresolved dispute must never auto-release: the payment
// stays frozen in escrow until the dispute is resolved.
const unresolvedDisputeOrderIds = async () => {
  const disputes = await Dispute.findAll({
    where: { status: { [Op.ne]: "resolved" } },
    attributes: ["orderId"],
    raw: true,
  });

  return disputes.map((dispute) => dispute.orderId);
};

// Escrow auto-release: delivered orders whose confirmation window has lapsed
// are completed and the payment marked released. Runs lazily on vendor reads
// so the countdown in the app always reflects the true server-side state.
// Disputed orders are excluded — their escrow is frozen until resolution.
const releaseDueEscrows = async (vendorId) => {
  const disputedIds = await unresolvedDisputeOrderIds();

  const due = await Order.findAll({
    where: {
      status: "delivered",
      autoReleaseAt: { [Op.lte]: new Date() },
      ...(vendorId ? { vendorId } : {}),
      ...(disputedIds.length ? { id: { [Op.notIn]: disputedIds } } : {}),
    },
  });

  for (const order of due) {
    await sequelize.transaction(async (transaction) => {
      await order.update(
        { status: "completed", escrowStatus: "released", completedAt: order.autoReleaseAt },
        { transaction },
      );

      if (order.productId) {
        await Product.increment(
          { unitsSold: order.quantity },
          { where: { id: order.productId }, transaction },
        );
      }
    });
  }

  return due.length;
};

const STATUS_BUCKETS = {
  pending: ["pending"],
  packaging: ["packaging", "ready_for_pickup"],
  shipped: ["shipped"],
  delivered: ["delivered"],
  completed: ["completed"],
};

const listVendorOrders = async (req, res, next) => {
  try {
    await releaseDueEscrows(req.user.id);

    const orders = await Order.findAll({
      where: { vendorId: req.user.id },
      order: [["created_at", "DESC"]],
      include: [buyerInclude],
    });

    const counts = { all: orders.length };
    Object.entries(STATUS_BUCKETS).forEach(([bucket, statuses]) => {
      counts[bucket] = orders.filter((order) => statuses.includes(order.status)).length;
    });

    const bucket = req.query.status || "all";
    const visible =
      bucket === "all"
        ? orders
        : orders.filter((order) => (STATUS_BUCKETS[bucket] || [bucket]).includes(order.status));

    return res.status(200).json({
      success: true,
      counts,
      orders: visible.map(serializeOrder),
    });
  } catch (error) {
    return next(error);
  }
};

const listBuyerOrders = async (req, res, next) => {
  try {
    await releaseDueEscrows();

    const orders = await Order.findAll({
      where: { buyerId: req.user.id },
      order: [["created_at", "DESC"]],
      include: [buyerInclude],
    });

    return res.status(200).json({ success: true, orders: orders.map(serializeOrder) });
  } catch (error) {
    return next(error);
  }
};

const findOrderForUser = async (req) => {
  // Riders are not assigned until pickup, so they may access unassigned orders
  // that are awaiting collection (the pickup code still gates the transition).
  const riderAccess =
    req.user.role === "rider"
      ? [{ riderId: req.user.id }, { status: "ready_for_pickup" }]
      : [];

  const order = await Order.findOne({
    where: {
      id: req.params.id,
      [Op.or]: [{ vendorId: req.user.id }, { buyerId: req.user.id }, ...riderAccess],
    },
    include: [buyerInclude],
  });

  if (!order) throw httpError(404, "Order not found");

  return order;
};

const getOrder = async (req, res, next) => {
  try {
    await releaseDueEscrows();
    const order = await findOrderForUser(req);

    return res.status(200).json({ success: true, order: serializeOrder(order) });
  } catch (error) {
    return next(error);
  }
};

// Buyer places an order; amounts are derived from the live product record.
const createOrder = async (req, res, next) => {
  try {
    const { productId, size, quantity = 1, deliveryAddress } = req.body;
    const product = await Product.findByPk(productId);

    if (!product || !product.isActive) throw httpError(404, "This item is not available");

    const qty = Math.max(1, parseInt(quantity, 10) || 1);

    if (product.stockQuantity < qty) throw httpError(400, "Not enough units in stock");
    if (!deliveryAddress || !String(deliveryAddress).trim()) {
      throw httpError(400, "Delivery address is required");
    }

    const unitPrice = product.usePriceRange ? product.priceMax : product.basePrice;
    const orderAmount = unitPrice * qty;
    const platformFee = Math.round((orderAmount * PLATFORM_FEE_PCT) / 100);

    const order = await Order.create({
      orderNo: await generateUniqueOrderNo(Order),
      vendorId: product.vendorId,
      buyerId: req.user.id,
      productId: product.id,
      productName: product.name,
      productImageUrl: (product.images || [])[0] || null,
      size: size || null,
      quantity: qty,
      unitPrice,
      orderAmount,
      platformFeePct: PLATFORM_FEE_PCT,
      platformFee,
      vendorReceives: orderAmount - platformFee,
      deliveryAddress: String(deliveryAddress).trim(),
    });

    return res.status(201).json({ success: true, order: serializeOrder(order) });
  } catch (error) {
    return next(error);
  }
};

const transition = (allowedFrom, apply) => async (req, res, next) => {
  try {
    const order = await findOrderForUser(req);

    if (!allowedFrom.includes(order.status)) {
      throw httpError(409, `This action is not available while the order is ${order.status}`);
    }

    await apply(order, req);
    await order.reload({ include: [buyerInclude] });

    return res.status(200).json({ success: true, order: serializeOrder(order) });
  } catch (error) {
    return next(error);
  }
};

const requireVendorOwner = (order, req) => {
  if (order.vendorId !== req.user.id) throw httpError(403, "Only the vendor can do this");
};

const acceptOrder = transition(["pending"], async (order, req) => {
  requireVendorOwner(order, req);

  await sequelize.transaction(async (transaction) => {
    if (order.productId) {
      const product = await Product.findByPk(order.productId, { transaction });

      if (product) {
        if (product.stockQuantity < order.quantity) {
          throw httpError(400, "Not enough stock to accept this order. Update your stock first.");
        }

        await product.decrement({ stockQuantity: order.quantity }, { transaction });
      }
    }

    await order.update({ status: "packaging", acceptedAt: new Date() }, { transaction });
  });
});

const declineOrder = transition(["pending"], async (order, req) => {
  requireVendorOwner(order, req);
  await order.update({ status: "declined", escrowStatus: "refunded", declinedAt: new Date() });
});

// Vendor confirms the packing checklist; a pickup code is generated for the rider.
const markReadyForPickup = transition(["packaging"], async (order, req) => {
  requireVendorOwner(order, req);
  await order.update({
    status: "ready_for_pickup",
    packedAt: new Date(),
    pickupCode: order.pickupCode || generateCode("OFM", 4),
  });
});

const cancelReadyForPickup = transition(["ready_for_pickup"], async (order, req) => {
  requireVendorOwner(order, req);
  await order.update({ status: "packaging" });
});

// Rider confirms collection with the vendor's pickup code.
const confirmPickup = transition(["ready_for_pickup"], async (order, req) => {
  if (req.user.role !== "rider") throw httpError(403, "Only a rider can confirm pickup");

  if (!req.body.pickupCode || req.body.pickupCode !== order.pickupCode) {
    throw httpError(400, "Invalid pickup code");
  }

  await order.update({ status: "shipped", riderId: req.user.id, pickedUpAt: new Date() });
});

// Rider marks the package delivered; the buyer's confirmation window starts.
const markDelivered = transition(["shipped"], async (order, req) => {
  if (req.user.role !== "rider" || order.riderId !== req.user.id) {
    throw httpError(403, "Only the assigned rider can mark this order delivered");
  }

  const deliveredAt = new Date();
  const autoReleaseAt = new Date(deliveredAt.getTime() + RELEASE_WINDOW_HOURS * 60 * 60 * 1000);

  await order.update({ status: "delivered", deliveredAt, autoReleaseAt });
});

// Buyer confirms receipt before the window lapses; payment releases immediately.
const confirmDelivery = transition(["delivered"], async (order, req) => {
  if (order.buyerId !== req.user.id) throw httpError(403, "Only the buyer can confirm delivery");

  const openDispute = await Dispute.findOne({
    where: { orderId: order.id, status: { [Op.ne]: "resolved" } },
  });

  if (openDispute) {
    throw httpError(
      409,
      "This order has an open dispute — payment stays in escrow until it's resolved.",
    );
  }

  await sequelize.transaction(async (transaction) => {
    await order.update(
      { status: "completed", escrowStatus: "released", completedAt: new Date() },
      { transaction },
    );

    if (order.productId) {
      await Product.increment(
        { unitsSold: order.quantity },
        { where: { id: order.productId }, transaction },
      );
    }
  });
});

module.exports = {
  listVendorOrders,
  listBuyerOrders,
  getOrder,
  createOrder,
  acceptOrder,
  declineOrder,
  markReadyForPickup,
  cancelReadyForPickup,
  confirmPickup,
  markDelivered,
  confirmDelivery,
  releaseDueEscrows,
};
