const { Op, fn, col } = require("sequelize");
const Product = require("../models/Product");
const ProductView = require("../models/ProductView");
const Order = require("../models/Order");
const Dispute = require("../models/Dispute");
const Review = require("../models/Review");
const User = require("../models/User");
const BuyerProfile = require("../models/BuyerProfile");
const { isVendorVerified } = require("../middleware/roleCheck");
const { releaseDueEscrows } = require("./orderController");

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const startOfWeek = (date) => {
  const day = startOfDay(date);
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  return day;
};

const startOfMonth = (date) => {
  const day = startOfDay(date);
  day.setDate(1);
  return day;
};

const weekdayIndex = (date) => (new Date(date).getDay() + 6) % 7;

const slugifyHandle = (value) =>
  String(value || "store")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60) || "store";

const vendorRating = async (vendorId) => {
  const row = await Review.findOne({
    where: { vendorId },
    attributes: [
      [fn("AVG", col("rating")), "avgRating"],
      [fn("COUNT", col("id")), "reviewCount"],
    ],
    raw: true,
  });

  return {
    rating: row?.avgRating ? Number(Number(row.avgRating).toFixed(1)) : 0,
    ratingCount: Number(row?.reviewCount || 0),
  };
};

const serializeStore = async (profile, user) => {
  if (!profile.storeHandle) {
    await profile.update({ storeHandle: slugifyHandle(profile.businessName) });
  }

  const { rating, ratingCount } = await vendorRating(profile.userId);

  return {
    businessName: profile.businessName,
    storeHandle: profile.storeHandle,
    storeLogoUrl: profile.storeLogoUrl,
    storeBannerUrl: profile.storeBannerUrl,
    description: profile.description,
    categories: profile.categories || [],
    address: profile.address,
    isLive: profile.isLive,
    rating,
    ratingCount,
    verification: {
      verified: isVendorVerified(profile),
      kycStatus: profile.kycStatus,
      onboardingStatus: profile.onboardingStatus,
      // Optional CAC trust badge — cosmetic only, never gates approval.
      cacVerified: profile.cacStatus === "verified",
    },
    owner: user ? { id: user.id, email: user.email, phone: user.phone } : undefined,
  };
};

const getMyStore = async (req, res, next) => {
  try {
    const store = await serializeStore(req.vendorProfile, req.user);

    return res.status(200).json({ success: true, store });
  } catch (error) {
    return next(error);
  }
};

const updateMyStore = async (req, res, next) => {
  try {
    const patch = {};

    if (typeof req.body.isLive === "boolean") patch.isLive = req.body.isLive;
    if (typeof req.body.description === "string") patch.description = req.body.description.trim();
    if (typeof req.body.storeLogoUrl === "string") patch.storeLogoUrl = req.body.storeLogoUrl;
    if (typeof req.body.storeHandle === "string" && req.body.storeHandle.trim()) {
      patch.storeHandle = slugifyHandle(req.body.storeHandle);
    }

    await req.vendorProfile.update(patch);
    const store = await serializeStore(req.vendorProfile, req.user);

    return res.status(200).json({ success: true, store });
  } catch (error) {
    return next(error);
  }
};

const viewsBetween = (vendorId, from, to) =>
  ProductView.count({
    where: { vendorId, createdAt: { [Op.gte]: from, [Op.lt]: to } },
  });

const getMyHome = async (req, res, next) => {
  try {
    await releaseDueEscrows(req.user.id);

    const now = new Date();
    const weekStart = startOfWeek(now);
    const lastWeekStart = new Date(weekStart.getTime() - 7 * DAY_MS);

    const [store, viewsThisWeek, viewsLastWeek, weekViews, attention, recentOrders, productCount] =
      await Promise.all([
        serializeStore(req.vendorProfile, req.user),
        viewsBetween(req.user.id, weekStart, now),
        viewsBetween(req.user.id, lastWeekStart, weekStart),
        ProductView.findAll({
          where: { vendorId: req.user.id, createdAt: { [Op.gte]: weekStart } },
          attributes: ["createdAt"],
          raw: true,
        }),
        Product.findAll({
          where: {
            vendorId: req.user.id,
            stockQuantity: { [Op.lte]: col("low_stock_threshold") },
          },
          order: [["stock_quantity", "ASC"]],
          limit: 5,
        }),
        Order.findAll({
          where: { vendorId: req.user.id },
          order: [["created_at", "DESC"]],
          limit: 3,
          include: [
            {
              model: User,
              as: "buyer",
              attributes: ["id", "email"],
              include: [{ model: BuyerProfile, as: "buyerProfile", attributes: ["fullName"] }],
            },
          ],
        }),
        Product.count({ where: { vendorId: req.user.id } }),
      ]);

    const viewsByDay = new Array(7).fill(0);
    weekViews.forEach((view) => {
      viewsByDay[weekdayIndex(view.createdAt || view.created_at)] += 1;
    });
    const maxViews = Math.max(...viewsByDay);
    const bestViewDay = maxViews > 0 ? WEEKDAYS[viewsByDay.indexOf(maxViews)] : null;

    return res.status(200).json({
      success: true,
      store,
      insight: {
        viewsThisWeek,
        viewsLastWeek,
        viewsChangePct:
          viewsLastWeek > 0
            ? Math.round(((viewsThisWeek - viewsLastWeek) / viewsLastWeek) * 100)
            : null,
        bestViewDay,
      },
      productCount,
      needsAttention: attention.map((product) => ({
        id: product.id,
        name: product.name,
        imageUrl: (product.images || [])[0] || null,
        stockQuantity: product.stockQuantity,
        stockStatus: product.stockStatus,
      })),
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        orderNo: order.orderNo,
        productName: order.productName,
        productImageUrl: order.productImageUrl,
        buyerName:
          order.buyer?.buyerProfile?.fullName || order.buyer?.email?.split("@")[0] || "Buyer",
        orderAmount: order.orderAmount,
        status: order.status,
      })),
    });
  } catch (error) {
    return next(error);
  }
};

const getMyAnalytics = async (req, res, next) => {
  try {
    await releaseDueEscrows(req.user.id);

    const period = req.query.period === "month" ? "month" : "week";
    const now = new Date();
    const rangeStart = period === "month" ? startOfMonth(now) : startOfWeek(now);
    const prevStart =
      period === "month"
        ? startOfMonth(new Date(rangeStart.getTime() - DAY_MS))
        : new Date(rangeStart.getTime() - 7 * DAY_MS);

    const [completedInRange, completedPrev, ordersInRange, ratingInfo, products] =
      await Promise.all([
        Order.findAll({
          where: {
            vendorId: req.user.id,
            status: "completed",
            completedAt: { [Op.gte]: rangeStart },
          },
          raw: true,
        }),
        Order.findAll({
          where: {
            vendorId: req.user.id,
            status: "completed",
            completedAt: { [Op.gte]: prevStart, [Op.lt]: rangeStart },
          },
          attributes: ["order_amount"],
          raw: true,
        }),
        Order.findAll({
          where: { vendorId: req.user.id, createdAt: { [Op.gte]: rangeStart } },
          raw: true,
        }),
        vendorRating(req.user.id),
        Product.findAll({
          where: { vendorId: req.user.id },
          order: [
            ["units_sold", "DESC"],
            ["views_count", "DESC"],
          ],
        }),
      ]);

    const revenueByWeekday = new Array(7).fill(0);
    const ordersByWeekday = new Array(7).fill(0);
    let totalRevenue = 0;

    completedInRange.forEach((order) => {
      const index = weekdayIndex(order.completed_at);
      revenueByWeekday[index] += order.order_amount;
      ordersByWeekday[index] += 1;
      totalRevenue += order.order_amount;
    });

    const prevRevenue = completedPrev.reduce((sum, order) => sum + order.order_amount, 0);
    const maxOrders = Math.max(...ordersByWeekday);

    // Average orders per month over the trailing 6 months of real orders.
    const sixMonthsAgo = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 5, 1));
    const trailingOrderCount = await Order.count({
      where: {
        vendorId: req.user.id,
        createdAt: { [Op.gte]: sixMonthsAgo },
        status: { [Op.notIn]: ["declined", "cancelled"] },
      },
    });

    const statusOf = (statuses) =>
      ordersInRange.filter((order) => statuses.includes(order.status)).length;

    return res.status(200).json({
      success: true,
      period,
      totalRevenue,
      revenueChangePct:
        prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : null,
      revenueByWeekday,
      weekdayLabels: WEEKDAYS,
      orders: {
        total: ordersInRange.length,
        completed: statusOf(["completed"]),
        pending: statusOf(["pending"]),
      },
      rating: ratingInfo,
      insight: {
        bestOrdersDay: maxOrders > 0 ? WEEKDAYS[ordersByWeekday.indexOf(maxOrders)] : null,
        avgOrdersPerMonth: Math.round(trailingOrderCount / 6),
      },
      topListings: products
        .filter((product) => product.unitsSold > 0 || product.viewsCount > 0)
        .slice(0, 3)
        .map((product, index) => ({
          id: product.id,
          name: product.name,
          imageUrl: (product.images || [])[0] || null,
          unitsSold: product.unitsSold,
          viewsCount: product.viewsCount,
          rank: index + 1,
        })),
    });
  } catch (error) {
    return next(error);
  }
};

const getMyReviews = async (req, res, next) => {
  try {
    const reviews = await Review.findAll({
      where: { vendorId: req.user.id },
      order: [["created_at", "DESC"]],
      limit: 20,
      include: [
        {
          model: User,
          as: "buyer",
          attributes: ["id", "email"],
          include: [{ model: BuyerProfile, as: "buyerProfile", attributes: ["fullName"] }],
        },
      ],
    });

    return res.status(200).json({
      success: true,
      reviews: reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        buyerName:
          review.buyer?.buyerProfile?.fullName || review.buyer?.email?.split("@")[0] || "Buyer",
        createdAt: review.createdAt,
      })),
    });
  } catch (error) {
    return next(error);
  }
};

const buyerInclude = {
  model: User,
  as: "buyer",
  attributes: ["id", "email"],
  include: [{ model: BuyerProfile, as: "buyerProfile", attributes: ["fullName"] }],
};

const buyerNameOf = (order) =>
  order.buyer?.buyerProfile?.fullName || order.buyer?.email?.split("@")[0] || "Buyer";

const nairaText = (value) => `₦${Number(value || 0).toLocaleString("en-NG")}`;

// Composes a real notification feed from existing tables — nothing is stored.
// Sources: orders awaiting acceptance, order milestones (shipped/delivered/
// payment released), open disputes, and low/out-of-stock products.
const getMyNotifications = async (req, res, next) => {
  try {
    const vendorId = req.user.id;

    const [pendingOrders, milestoneOrders, openDisputes, stockAlerts] = await Promise.all([
      Order.findAll({
        where: { vendorId, status: "pending" },
        order: [["created_at", "DESC"]],
        limit: 15,
        include: [buyerInclude],
      }),
      Order.findAll({
        where: { vendorId, status: { [Op.in]: ["shipped", "delivered", "completed"] } },
        order: [["updated_at", "DESC"]],
        limit: 15,
        include: [buyerInclude],
      }),
      Dispute.findAll({
        where: { vendorId, status: { [Op.ne]: "resolved" } },
        order: [["created_at", "DESC"]],
        limit: 10,
        include: [{ model: Order, as: "order", attributes: ["id", "productName"] }],
      }),
      Product.findAll({
        where: {
          vendorId,
          isActive: true,
          stockQuantity: { [Op.lte]: col("low_stock_threshold") },
        },
        order: [["updated_at", "DESC"]],
        limit: 10,
      }),
    ]);

    const items = [];

    pendingOrders.forEach((order) => {
      items.push({
        id: `order-new-${order.id}`,
        type: "new_order",
        title: `New order — ${order.productName} from ${buyerNameOf(order)}`,
        body: `${nairaText(order.orderAmount)} · waiting for you to accept`,
        tone: "teal",
        createdAt: order.createdAt,
        targetType: "order",
        targetId: order.id,
      });
    });

    milestoneOrders.forEach((order) => {
      if (order.status === "shipped") {
        items.push({
          id: `order-shipped-${order.id}`,
          type: "order_shipped",
          title: `Order shipped — ${order.productName}`,
          body: `${buyerNameOf(order)}'s order is on its way`,
          tone: "teal",
          createdAt: order.pickedUpAt || order.updatedAt,
          targetType: "order",
          targetId: order.id,
        });
      } else if (order.status === "delivered") {
        items.push({
          id: `order-delivered-${order.id}`,
          type: "order_delivered",
          title: `Order delivered — ${order.productName}`,
          body: `Waiting for ${buyerNameOf(order)} to confirm`,
          tone: "green",
          createdAt: order.deliveredAt || order.updatedAt,
          targetType: "order",
          targetId: order.id,
        });
      } else {
        // completed — escrow released to the vendor (no escrowReleasedAt
        // column exists, completedAt is the release moment).
        items.push({
          id: `order-completed-${order.id}`,
          type: "payment_released",
          title: `Payment released — ${order.productName}`,
          body: `${nairaText(order.vendorReceives)} released from escrow to your payout account`,
          tone: "green",
          createdAt: order.completedAt || order.updatedAt,
          targetType: "order",
          targetId: order.id,
        });
      }
    });

    openDisputes.forEach((dispute) => {
      items.push({
        id: `dispute-${dispute.id}`,
        type: "dispute",
        title: `Dispute filed on ${dispute.order?.productName || "an order"} — payment on hold`,
        body: `${nairaText(dispute.amountHeld)} stays in escrow until it's resolved`,
        tone: "red",
        createdAt: dispute.createdAt,
        targetType: "dispute",
        targetId: dispute.id,
      });
    });

    stockAlerts.forEach((product) => {
      const out = product.stockQuantity <= 0;
      items.push({
        id: `stock-${product.id}`,
        type: out ? "out_of_stock" : "low_stock",
        title: out
          ? `${product.name} is out of stock`
          : `${product.name} is low on stock — ${product.stockQuantity} left`,
        body: out
          ? "Buyers can't order it until you restock"
          : "Restock soon so you don't miss orders",
        tone: "amber",
        createdAt: product.updatedAt,
        targetType: "product",
        targetId: product.id,
      });
    });

    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({ success: true, items: items.slice(0, 30) });
  } catch (error) {
    return next(error);
  }
};

// Personal info: full name lives on VendorProfile; email/phone live on User.
// (VendorProfile has no gender/date-of-birth columns.) Email is read-only.
const serializePersonal = (req) => ({
  fullName: req.vendorProfile.fullName,
  email: req.user.email,
  phone: req.user.phone,
});

const getMyPersonal = async (req, res, next) => {
  try {
    return res.status(200).json({ success: true, personal: serializePersonal(req) });
  } catch (error) {
    return next(error);
  }
};

const updateMyPersonal = async (req, res, next) => {
  try {
    if (typeof req.body.fullName === "string" && req.body.fullName.trim()) {
      await req.vendorProfile.update({ fullName: req.body.fullName.trim() });
    }

    if (typeof req.body.phone === "string" && req.body.phone.trim()) {
      const phone = req.body.phone.trim();
      // A duplicate phone throws SequelizeUniqueConstraintError, which the
      // global error handler translates into a friendly 409.
      if (phone !== req.user.phone) await req.user.update({ phone });
    }

    return res.status(200).json({ success: true, personal: serializePersonal(req) });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getMyStore,
  updateMyStore,
  getMyHome,
  getMyAnalytics,
  getMyReviews,
  getMyNotifications,
  getMyPersonal,
  updateMyPersonal,
};
