const { Op } = require("sequelize");
const Product = require("../models/Product");
const ProductView = require("../models/ProductView");
const Review = require("../models/Review");
const User = require("../models/User");
const BuyerProfile = require("../models/BuyerProfile");
const VendorProfile = require("../models/VendorProfile");

const httpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const parsePricing = (body) => {
  const usePriceRange = Boolean(body.usePriceRange);

  if (usePriceRange) {
    const priceMin = Number(body.priceMin);
    const priceMax = Number(body.priceMax);

    if (!Number.isFinite(priceMin) || !Number.isFinite(priceMax) || priceMin <= 0 || priceMax <= 0) {
      throw httpError(400, "Provide a valid minimum and maximum price");
    }

    if (priceMin > priceMax) {
      throw httpError(400, "Minimum price cannot be greater than maximum price");
    }

    return { usePriceRange, priceMin: Math.round(priceMin), priceMax: Math.round(priceMax), basePrice: Math.round(priceMax) };
  }

  const basePrice = Number(body.basePrice);

  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    throw httpError(400, "Provide a valid base price");
  }

  return { usePriceRange, basePrice: Math.round(basePrice), priceMin: null, priceMax: null };
};

const cleanStringArray = (value, max = 20) =>
  Array.isArray(value)
    ? value
        .map((item) => String(item).trim())
        .filter(Boolean)
        .slice(0, max)
    : [];

const productPayload = (body) => {
  const name = String(body.name || "").trim();

  if (!name) throw httpError(400, "Item name is required");

  const condition = body.condition === "thrift" ? "thrift" : "new_with_tags";
  const images = cleanStringArray(body.images, 6);
  const stockQuantity = Math.max(0, parseInt(body.stockQuantity, 10) || 0);

  return {
    name,
    condition,
    images,
    ...parsePricing(body),
    sizes: cleanStringArray(body.sizes, 10),
    stockQuantity,
    occasionTags: cleanStringArray(body.occasionTags),
    styleTags: cleanStringArray(body.styleTags),
    customTags: cleanStringArray(body.customTags),
    measurements:
      body.measurements && typeof body.measurements === "object" ? body.measurements : {},
  };
};

// Badges are computed from real sales/views figures across the vendor's catalogue.
const computeBadges = (products) => {
  const bestSeller = products.reduce(
    (best, product) => (product.unitsSold > (best?.unitsSold || 0) ? product : best),
    null,
  );
  const trending = products.reduce(
    (top, product) => (product.viewsCount > (top?.viewsCount || 0) ? product : top),
    null,
  );

  return {
    bestSellerId: bestSeller && bestSeller.unitsSold > 0 ? bestSeller.id : null,
    trendingId:
      trending && trending.viewsCount > 0 && trending.id !== (bestSeller?.id || null)
        ? trending.id
        : null,
  };
};

const serializeProduct = (product, badges = {}) => ({
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
  occasionTags: product.occasionTags || [],
  styleTags: product.styleTags || [],
  customTags: product.customTags || [],
  measurements: product.measurements || {},
  isActive: product.isActive,
  notifyOnRestock: product.notifyOnRestock,
  unitsSold: product.unitsSold,
  viewsCount: product.viewsCount,
  isBestSeller: badges.bestSellerId === product.id,
  isTrending: badges.trendingId === product.id,
  createdAt: product.createdAt,
});

const findOwnProduct = async (req) => {
  const product = await Product.findOne({
    where: { id: req.params.id, vendorId: req.user.id },
  });

  if (!product) throw httpError(404, "Product not found in your store");

  return product;
};

const createProduct = async (req, res, next) => {
  try {
    const payload = productPayload(req.body);
    const product = await Product.create({ ...payload, vendorId: req.user.id });

    return res.status(201).json({ success: true, product: serializeProduct(product) });
  } catch (error) {
    return next(error);
  }
};

const listMyProducts = async (req, res, next) => {
  try {
    const filter = req.query.filter || "all";
    const products = await Product.findAll({
      where: { vendorId: req.user.id },
      order: [["created_at", "DESC"]],
    });

    const badges = computeBadges(products);
    const isActiveListing = (product) => product.isActive && product.stockQuantity > 0;
    const isOutOfStock = (product) => product.stockQuantity <= 0;

    const counts = {
      all: products.length,
      active: products.filter(isActiveListing).length,
      outOfStock: products.filter(isOutOfStock).length,
    };

    let visible = products;
    if (filter === "active") visible = products.filter(isActiveListing);
    if (filter === "out_of_stock") visible = products.filter(isOutOfStock);

    return res.status(200).json({
      success: true,
      counts,
      products: visible.map((product) => serializeProduct(product, badges)),
    });
  } catch (error) {
    return next(error);
  }
};

const getMyProduct = async (req, res, next) => {
  try {
    const product = await findOwnProduct(req);
    const siblings = await Product.findAll({ where: { vendorId: req.user.id } });
    const badges = computeBadges(siblings);

    const [reviews, ratingRow, vendorProfile] = await Promise.all([
      Review.findAll({
        where: { productId: product.id },
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
      Review.findOne({
        where: { vendorId: req.user.id },
        attributes: [
          [Review.sequelize.fn("AVG", Review.sequelize.col("rating")), "avgRating"],
          [Review.sequelize.fn("COUNT", Review.sequelize.col("id")), "reviewCount"],
        ],
        raw: true,
      }),
      VendorProfile.findOne({ where: { userId: req.user.id } }),
    ]);

    const productReviewCount = await Review.count({ where: { productId: product.id } });
    const totalSold = siblings.reduce((sum, item) => sum + item.unitsSold, 0);

    return res.status(200).json({
      success: true,
      product: serializeProduct(product, badges),
      reviews: reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        buyerName: review.buyer?.buyerProfile?.fullName || review.buyer?.email?.split("@")[0] || "Buyer",
        createdAt: review.createdAt,
      })),
      reviewCount: productReviewCount,
      store: vendorProfile
        ? {
            businessName: vendorProfile.businessName,
            storeHandle: vendorProfile.storeHandle,
            storeLogoUrl: vendorProfile.storeLogoUrl,
            categories: vendorProfile.categories || [],
            isLive: vendorProfile.isLive,
            rating: ratingRow?.avgRating ? Number(Number(ratingRow.avgRating).toFixed(1)) : 0,
            ratingCount: Number(ratingRow?.reviewCount || 0),
            totalSold,
          }
        : null,
    });
  } catch (error) {
    return next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const product = await findOwnProduct(req);
    const payload = productPayload({ ...product.toJSON(), ...req.body });

    await product.update(payload);

    return res.status(200).json({ success: true, product: serializeProduct(product) });
  } catch (error) {
    return next(error);
  }
};

const updateStock = async (req, res, next) => {
  try {
    const product = await findOwnProduct(req);
    const stockQuantity = Math.max(0, parseInt(req.body.stockQuantity, 10) || 0);
    const patch = { stockQuantity };

    if (typeof req.body.notifyOnRestock === "boolean") {
      patch.notifyOnRestock = req.body.notifyOnRestock;
    }

    await product.update(patch);

    return res.status(200).json({ success: true, product: serializeProduct(product) });
  } catch (error) {
    return next(error);
  }
};

const setActiveStatus = async (req, res, next) => {
  try {
    const product = await findOwnProduct(req);
    await product.update({ isActive: Boolean(req.body.isActive) });

    return res.status(200).json({ success: true, product: serializeProduct(product) });
  } catch (error) {
    return next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const product = await findOwnProduct(req);
    await product.destroy();

    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
};

// Public: records a real buyer view so vendor insights reflect actual traffic.
const recordView = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id);

    if (!product) throw httpError(404, "Product not found");

    await Promise.all([
      ProductView.create({ productId: product.id, vendorId: product.vendorId }),
      product.increment("viewsCount"),
    ]);

    return res.status(201).json({ success: true });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createProduct,
  listMyProducts,
  getMyProduct,
  updateProduct,
  updateStock,
  setActiveStatus,
  deleteProduct,
  recordView,
};
