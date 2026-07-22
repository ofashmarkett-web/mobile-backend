const { Op, fn, col } = require("sequelize");
const BuyerProfile = require("../models/BuyerProfile");
const VendorProfile = require("../models/VendorProfile");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Review = require("../models/Review");
const { isVendorVerified } = require("../middleware/roleCheck");

const enforcementOn = () => process.env.VENDOR_VERIFICATION_ENFORCED !== "false";

// Vendors whose products may appear in the buyer marketplace: store is live
// and (when enforcement is on) the vendor is verified.
const visibleVendorProfiles = async () => {
  const profiles = await VendorProfile.findAll({ where: { isLive: true } });
  return profiles.filter((profile) => !enforcementOn() || isVendorVerified(profile));
};

const ratingsByVendor = async (vendorIds) => {
  if (vendorIds.length === 0) return {};

  const rows = await Review.findAll({
    where: { vendorId: { [Op.in]: vendorIds } },
    attributes: [
      "vendorId",
      [fn("AVG", col("rating")), "avgRating"],
      [fn("COUNT", col("id")), "reviewCount"],
    ],
    group: ["vendor_id"],
    raw: true,
  });

  return Object.fromEntries(
    rows.map((row) => [
      row.vendorId,
      {
        rating: Number(Number(row.avgRating).toFixed(1)),
        ratingCount: Number(row.reviewCount),
      },
    ]),
  );
};

const storeCard = (profile, ratings) => ({
  vendorId: profile.userId,
  businessName: profile.businessName,
  storeHandle: profile.storeHandle,
  storeLogoUrl: profile.storeLogoUrl,
  categories: profile.categories || [],
  address: profile.address,
  isLive: profile.isLive,
  rating: ratings[profile.userId]?.rating || 0,
  ratingCount: ratings[profile.userId]?.ratingCount || 0,
  // Optional CAC trust badge shown on buyer-facing store cards.
  cacVerified: profile.cacStatus === "verified",
});

const getMyProfile = async (req, res, next) => {
  try {
    const profile = await BuyerProfile.findOne({ where: { userId: req.user.id } });

    return res.status(200).json({
      success: true,
      profile: profile
        ? {
            fullName: profile.fullName,
            gender: profile.gender,
            defaultAddress: profile.defaultAddress,
          }
        : null,
      user: { id: req.user.id, email: req.user.email, phone: req.user.phone },
    });
  } catch (error) {
    return next(error);
  }
};

const updateMyProfile = async (req, res, next) => {
  try {
    const profile = await BuyerProfile.findOne({ where: { userId: req.user.id } });

    if (!profile) {
      const error = new Error("Complete buyer onboarding first");
      error.statusCode = 403;
      throw error;
    }

    const patch = {};
    if (typeof req.body.defaultAddress === "string") {
      patch.defaultAddress = req.body.defaultAddress.trim();
    }
    if (typeof req.body.fullName === "string" && req.body.fullName.trim()) {
      patch.fullName = req.body.fullName.trim();
    }

    await profile.update(patch);

    return res.status(200).json({
      success: true,
      profile: {
        fullName: profile.fullName,
        gender: profile.gender,
        defaultAddress: profile.defaultAddress,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// Marketplace browse: live-store products with real filters from the MVP spec —
// budget range, outfit type (style), event type (occasion), text search.
const browseProducts = async (req, res, next) => {
  try {
    const vendors = await visibleVendorProfiles();
    const vendorIds = vendors.map((profile) => profile.userId);

    if (req.query.vendorId) {
      const allowed = vendorIds.includes(req.query.vendorId);
      if (!allowed) return res.status(200).json({ success: true, products: [], vendors: [] });
    }

    const where = {
      vendorId: { [Op.in]: req.query.vendorId ? [req.query.vendorId] : vendorIds },
      isActive: true,
      stockQuantity: { [Op.gt]: 0 },
    };

    if (req.query.q) {
      where.name = { [Op.iLike]: `%${String(req.query.q).trim()}%` };
    }

    const budgetMin = Number(req.query.budgetMin);
    const budgetMax = Number(req.query.budgetMax);
    if (Number.isFinite(budgetMin) && budgetMin > 0) where.basePrice = { [Op.gte]: budgetMin };
    if (Number.isFinite(budgetMax) && budgetMax > 0) {
      where.basePrice = { ...(where.basePrice || {}), [Op.lte]: budgetMax };
    }

    if (req.query.style) where.styleTags = { [Op.contains]: [req.query.style] };
    if (req.query.occasion) where.occasionTags = { [Op.contains]: [req.query.occasion] };

    const products = await Product.findAll({
      where,
      order: [["created_at", "DESC"]],
      limit: 60,
    });

    const ratings = await ratingsByVendor(vendorIds);
    const vendorById = Object.fromEntries(vendors.map((profile) => [profile.userId, profile]));

    return res.status(200).json({
      success: true,
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        condition: product.condition,
        images: product.images || [],
        usePriceRange: product.usePriceRange,
        basePrice: product.basePrice,
        priceMin: product.priceMin,
        priceMax: product.priceMax,
        sizes: product.sizes || [],
        stockQuantity: product.stockQuantity,
        stockStatus: product.stockStatus,
        store: vendorById[product.vendorId]
          ? storeCard(vendorById[product.vendorId], ratings)
          : null,
      })),
    });
  } catch (error) {
    return next(error);
  }
};

const getBuyerProduct = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id);

    if (!product || !product.isActive) {
      const error = new Error("This item is no longer available");
      error.statusCode = 404;
      throw error;
    }

    const profile = await VendorProfile.findOne({ where: { userId: product.vendorId } });
    const ratings = await ratingsByVendor([product.vendorId]);
    const reviews = await Review.findAll({
      where: { productId: product.id },
      order: [["created_at", "DESC"]],
      limit: 10,
      raw: true,
    });

    return res.status(200).json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        condition: product.condition,
        images: product.images || [],
        usePriceRange: product.usePriceRange,
        basePrice: product.basePrice,
        priceMin: product.priceMin,
        priceMax: product.priceMax,
        sizes: product.sizes || [],
        measurements: product.measurements || {},
        stockQuantity: product.stockQuantity,
        stockStatus: product.stockStatus,
        occasionTags: product.occasionTags || [],
        styleTags: product.styleTags || [],
      },
      store: profile ? storeCard(profile, ratings) : null,
      reviews: reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.created_at,
      })),
    });
  } catch (error) {
    return next(error);
  }
};

// Vendor recommendations with honest, computable tags only: Highly Rated and
// Popular come from real reviews/sales. (Near You / Fast Responder arrive with
// the location and chat milestones.)
const recommendedVendors = async (req, res, next) => {
  try {
    const vendors = await visibleVendorProfiles();
    const vendorIds = vendors.map((profile) => profile.userId);
    const ratings = await ratingsByVendor(vendorIds);

    const orderCounts =
      vendorIds.length > 0
        ? await Order.findAll({
            where: { vendorId: { [Op.in]: vendorIds }, status: "completed" },
            attributes: ["vendorId", [fn("COUNT", col("id")), "completedOrders"]],
            group: ["vendor_id"],
            raw: true,
          })
        : [];
    const completedByVendor = Object.fromEntries(
      orderCounts.map((row) => [row.vendorId, Number(row.completedOrders)]),
    );
    const popularBar = Math.max(...Object.values(completedByVendor), 0);

    const cards = vendors
      .map((profile) => {
        const card = storeCard(profile, ratings);
        const completed = completedByVendor[profile.userId] || 0;
        const tags = [];

        if (card.rating >= 4.5 && card.ratingCount >= 3) tags.push("Highly Rated");
        if (completed > 0 && completed === popularBar) tags.push("Popular");

        return { ...card, completedOrders: completed, tags };
      })
      .sort((a, b) => b.rating - a.rating || b.completedOrders - a.completedOrders)
      .slice(0, 10);

    return res.status(200).json({ success: true, vendors: cards });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  browseProducts,
  getBuyerProduct,
  recommendedVendors,
};
