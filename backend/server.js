const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const path = require("path");

const sequelize = require("./src/config/database");
const authRoutes = require("./src/routes/authRoutes");
const onboardingRoutes = require("./src/routes/onboardingRoutes");
const vendorRoutes = require("./src/routes/vendorRoutes");
const buyerRoutes = require("./src/routes/buyerRoutes");
const productRoutes = require("./src/routes/productRoutes");
const orderRoutes = require("./src/routes/orderRoutes");
const disputeRoutes = require("./src/routes/disputeRoutes");
const uploadRoutes = require("./src/routes/uploadRoutes");
const User = require("./src/models/User");
const BuyerProfile = require("./src/models/BuyerProfile");
const VendorProfile = require("./src/models/VendorProfile");
const RiderProfile = require("./src/models/RiderProfile");
const Product = require("./src/models/Product");
const ProductView = require("./src/models/ProductView");
const Order = require("./src/models/Order");
const Review = require("./src/models/Review");
const Dispute = require("./src/models/Dispute");

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.CORS_ORIGIN || "*")
  .split(",")
  .map((origin) => origin.trim());

User.hasOne(BuyerProfile, { foreignKey: "userId", as: "buyerProfile" });
BuyerProfile.belongsTo(User, { foreignKey: "userId", as: "user" });
User.hasOne(VendorProfile, { foreignKey: "userId", as: "vendorProfile" });
VendorProfile.belongsTo(User, { foreignKey: "userId", as: "user" });
User.hasOne(RiderProfile, { foreignKey: "userId", as: "riderProfile" });
RiderProfile.belongsTo(User, { foreignKey: "userId", as: "user" });

User.hasMany(Product, { foreignKey: "vendorId", as: "products" });
Product.belongsTo(User, { foreignKey: "vendorId", as: "vendor" });
Product.hasMany(ProductView, { foreignKey: "productId", as: "views" });
ProductView.belongsTo(Product, { foreignKey: "productId", as: "product" });
Order.belongsTo(User, { foreignKey: "buyerId", as: "buyer" });
Order.belongsTo(User, { foreignKey: "vendorId", as: "vendor" });
Order.belongsTo(Product, { foreignKey: "productId", as: "product" });
Review.belongsTo(User, { foreignKey: "buyerId", as: "buyer" });
Review.belongsTo(User, { foreignKey: "vendorId", as: "vendor" });
Review.belongsTo(Product, { foreignKey: "productId", as: "product" });
Dispute.belongsTo(Order, { foreignKey: "orderId", as: "order" });
Order.hasOne(Dispute, { foreignKey: "orderId", as: "dispute" });
Dispute.belongsTo(User, { foreignKey: "buyerId", as: "buyer" });
Dispute.belongsTo(User, { foreignKey: "vendorId", as: "vendor" });

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(
  "/api/v1/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
app.use(
  "/api/v1/onboarding",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get("/health", (req, res) => {
  res.status(200).json({ success: true, service: "ofash-markett-api" });
});

app.get("/api/v1/health", (req, res) => {
  res.status(200).json({ success: true, service: "ofash-markett-api" });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/onboarding", onboardingRoutes);
app.use("/api/v1/vendors", vendorRoutes);
app.use("/api/v1/buyers", buyerRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/disputes", disputeRoutes);
app.use("/api/v1/uploads", uploadRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use((error, req, res, next) => {
  let statusCode = error.statusCode || 500;
  let message = error.message || "Server error";

  // Sequelize constraint errors surface as an unhelpful "Validation error" —
  // translate them for the app.
  if (error.name === "SequelizeUniqueConstraintError") {
    statusCode = 409;
    const field = error.errors?.[0]?.path || "value";
    message = `An account with this ${field} already exists.`;
  } else if (error.name === "SequelizeValidationError") {
    statusCode = 400;
    message = error.errors?.[0]?.message || "Some of the details provided are invalid.";
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
});

const start = async () => {
  await sequelize.authenticate();

  if (process.env.DB_SYNC === "true") {
    await sequelize.sync({ alter: true });
  }

  app.listen(PORT, () => {
    console.log(`O-FASH MARKETT API running on port ${PORT}`);
  });
};

start().catch((error) => {
  console.error("API startup failed:", error);
  process.exit(1);
});

module.exports = app;
