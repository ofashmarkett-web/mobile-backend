const { Op, fn, col, literal } = require("sequelize");
const sequelize = require("../config/database");
const BuyerProfile = require("../models/BuyerProfile");
const VendorProfile = require("../models/VendorProfile");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Review = require("../models/Review");
const User = require("../models/User");
const { isVendorVerified } = require("../middleware/roleCheck");

// Real great-circle distance in km — used to compute the "Near You" vendor tag
// from actual buyer/vendor coordinates.
const haversineKm = (latA, lonA, latB, lonB) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(latB - latA);
  const dLon = toRad(lonB - lonA);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(latA)) * Math.cos(toRad(latB)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
};

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
            dateOfBirth: profile.dateOfBirth,
            gender: profile.gender,
            defaultAddress: profile.defaultAddress,
            latitude: profile.latitude != null ? Number(profile.latitude) : null,
            longitude: profile.longitude != null ? Number(profile.longitude) : null,
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

    // Device coordinates, saved when the buyer grants location access.
    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);
    if (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      Math.abs(latitude) <= 90 &&
      Math.abs(longitude) <= 180
    ) {
      patch.latitude = latitude;
      patch.longitude = longitude;
    }

    await profile.update(patch);

    return res.status(200).json({
      success: true,
      profile: {
        fullName: profile.fullName,
        gender: profile.gender,
        defaultAddress: profile.defaultAddress,
        latitude: profile.latitude != null ? Number(profile.latitude) : null,
        longitude: profile.longitude != null ? Number(profile.longitude) : null,
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

    // Category filter: matches the product's style/occasion tags OR any vendor
    // whose store categories include the value.
    if (req.query.category) {
      const category = String(req.query.category).trim();
      const categoryVendorIds = vendors
        .filter((profile) =>
          (profile.categories || []).some(
            (item) => String(item).toLowerCase() === category.toLowerCase(),
          ),
        )
        .map((profile) => profile.userId);

      where[Op.or] = [
        { styleTags: { [Op.contains]: [category] } },
        { occasionTags: { [Op.contains]: [category] } },
        ...(categoryVendorIds.length > 0 ? [{ vendorId: { [Op.in]: categoryVendorIds } }] : []),
      ];
    }

    // Colour filter — case-insensitive match against the product's colours
    // array. The value is sanitised to letters/spaces before it reaches SQL.
    if (req.query.colour) {
      const colour = String(req.query.colour).replace(/[^a-z\s-]/gi, "").trim().toLowerCase();
      if (colour) {
        where[Op.and] = [
          ...(where[Op.and] || []),
          literal(
            `EXISTS (SELECT 1 FROM jsonb_array_elements_text("Product"."colours") AS colour_item WHERE lower(colour_item) = ${sequelize.escape(colour)})`,
          ),
        ];
      }
    }

    const sortOrders = {
      // Best selling: proven sales first, traffic as tie-breaker.
      best_selling: [["units_sold", "DESC"], ["views_count", "DESC"], ["created_at", "DESC"]],
      // Featured: what buyers are looking at most right now.
      featured: [["views_count", "DESC"], ["created_at", "DESC"]],
    };
    const order = sortOrders[req.query.sort] || [["created_at", "DESC"]];

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 60, 1), 60);

    const products = await Product.findAll({ where, order, limit });

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
        colours: product.colours || [],
        stockQuantity: product.stockQuantity,
        stockStatus: product.stockStatus,
        unitsSold: product.unitsSold,
        occasionTags: product.occasionTags || [],
        styleTags: product.styleTags || [],
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
        unitsSold: product.unitsSold,
        colours: product.colours || [],
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
// Popular come from real reviews/sales, Near You from real coordinates on both
// sides. (Fast Responder arrives with the chat milestone.)
const recommendedVendors = async (req, res, next) => {
  try {
    const vendors = await visibleVendorProfiles();
    const vendorIds = vendors.map((profile) => profile.userId);
    const ratings = await ratingsByVendor(vendorIds);

    // Buyer coordinates (saved when they allowed location access) power the
    // distance sort and the "Near You" tag.
    const buyerProfile = await BuyerProfile.findOne({ where: { userId: req.user.id } });
    const buyerLat = buyerProfile?.latitude != null ? Number(buyerProfile.latitude) : null;
    const buyerLon = buyerProfile?.longitude != null ? Number(buyerProfile.longitude) : null;
    const buyerHasCoords = Number.isFinite(buyerLat) && Number.isFinite(buyerLon);

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

        const vendorLat = profile.latitude != null ? Number(profile.latitude) : null;
        const vendorLon = profile.longitude != null ? Number(profile.longitude) : null;
        const distanceKm =
          buyerHasCoords && Number.isFinite(vendorLat) && Number.isFinite(vendorLon)
            ? haversineKm(buyerLat, buyerLon, vendorLat, vendorLon)
            : null;

        if (card.rating >= 4.5 && card.ratingCount >= 3) tags.push("Highly Rated");
        if (completed > 0 && completed === popularBar) tags.push("Popular");
        if (distanceKm !== null && distanceKm <= 15) tags.push("Near You");

        return {
          ...card,
          completedOrders: completed,
          distanceKm: distanceKm !== null ? Number(distanceKm.toFixed(1)) : null,
          tags,
        };
      })
      .sort((a, b) => {
        // With buyer coords: closest first (vendors without coords last),
        // otherwise the original rating/sales order.
        if (buyerHasCoords) {
          const aDist = a.distanceKm ?? Infinity;
          const bDist = b.distanceKm ?? Infinity;
          if (aDist !== bDist) return aDist - bDist;
        }
        return b.rating - a.rating || b.completedOrders - a.completedOrders;
      })
      .slice(0, 10);

    return res.status(200).json({ success: true, vendors: cards });
  } catch (error) {
    return next(error);
  }
};

// Public store page: header card, real stats, latest reviews and the live
// catalogue for one vendor.
const getStorePage = async (req, res, next) => {
  try {
    const profile = await VendorProfile.findOne({ where: { userId: req.params.vendorId } });

    if (!profile || !profile.isLive || (enforcementOn() && !isVendorVerified(profile))) {
      const error = new Error("This store is not available");
      error.statusCode = 404;
      throw error;
    }

    const vendorId = profile.userId;
    const ratings = await ratingsByVendor([vendorId]);

    const [products, reviews, totalOrders, completedOrders] = await Promise.all([
      Product.findAll({
        where: { vendorId, isActive: true, stockQuantity: { [Op.gt]: 0 } },
        order: [["created_at", "DESC"]],
      }),
      Review.findAll({
        where: { vendorId },
        order: [["created_at", "DESC"]],
        limit: 10,
        include: [
          {
            model: User,
            as: "buyer",
            attributes: ["id", "email"],
            include: [{ model: BuyerProfile, as: "buyerProfile", attributes: ["fullName"] }],
          },
        ],
      }),
      Order.count({ where: { vendorId } }),
      Order.count({ where: { vendorId, status: "completed" } }),
    ]);

    // Units sold across the whole catalogue (including inactive items).
    const soldRow = await Product.findOne({
      where: { vendorId },
      attributes: [[fn("COALESCE", fn("SUM", col("units_sold")), 0), "totalSold"]],
      raw: true,
    });

    return res.status(200).json({
      success: true,
      store: storeCard(profile, ratings),
      description: profile.description || "",
      stats: {
        rating: ratings[vendorId]?.rating || 0,
        ratingCount: ratings[vendorId]?.ratingCount || 0,
        unitsSold: Number(soldRow?.totalSold || 0),
        productCount: products.length,
        joinedAt: profile.createdAt,
        // Real completion rate: completed orders over all orders ever placed
        // with this vendor. Null (not 0) when there is no order history yet.
        completionRate:
          totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : null,
        totalOrders,
        completedOrders,
      },
      reviews: reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        buyerName:
          review.buyer?.buyerProfile?.fullName?.split(" ")[0] ||
          review.buyer?.email?.split("@")[0] ||
          "Buyer",
        createdAt: review.createdAt,
      })),
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
        colours: product.colours || [],
        stockQuantity: product.stockQuantity,
        stockStatus: product.stockStatus,
        unitsSold: product.unitsSold,
      })),
    });
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
  getStorePage,
};
