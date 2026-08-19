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
const reviewRoutes = require("./src/routes/reviewRoutes");
const uploadRoutes = require("./src/routes/uploadRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");
const favoriteRoutes = require("./src/routes/favoriteRoutes");
const User = require("./src/models/User");
const BuyerProfile = require("./src/models/BuyerProfile");
const VendorProfile = require("./src/models/VendorProfile");
const RiderProfile = require("./src/models/RiderProfile");
const Product = require("./src/models/Product");
const ProductView = require("./src/models/ProductView");
const Order = require("./src/models/Order");
const Review = require("./src/models/Review");
const Dispute = require("./src/models/Dispute");
const Notification = require("./src/models/Notification");
const DeviceToken = require("./src/models/DeviceToken");
const VendorFavorite = require("./src/models/VendorFavorite");
const ChatRoom = require("./src/models/ChatRoom");
const ChatMessage = require("./src/models/ChatMessage");
const chatRoutes = require("./src/routes/chatRoutes");

const app = express();
// Render terminates TLS and forwards client IPs through X-Forwarded-For.
app.set("trust proxy", 1);
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
User.hasMany(Notification, { foreignKey: "recipientUserId", as: "notifications" });
Notification.belongsTo(User, { foreignKey: "recipientUserId", as: "recipient" });
User.hasMany(DeviceToken, { foreignKey: "userId", as: "deviceTokens" });
DeviceToken.belongsTo(User, { foreignKey: "userId", as: "user" });
User.hasMany(VendorFavorite, { foreignKey: "buyerId", as: "favoriteVendors" });
VendorFavorite.belongsTo(User, { foreignKey: "buyerId", as: "buyer" });
User.hasMany(VendorFavorite, { foreignKey: "vendorId", as: "followers" });
VendorFavorite.belongsTo(User, { foreignKey: "vendorId", as: "vendor" });
User.hasMany(ChatRoom, { foreignKey: "buyerId", as: "buyerChats" });
User.hasMany(ChatRoom, { foreignKey: "vendorId", as: "vendorChats" });
ChatRoom.belongsTo(User, { foreignKey: "buyerId", as: "buyer" });
ChatRoom.belongsTo(User, { foreignKey: "vendorId", as: "vendor" });
ChatRoom.hasMany(ChatMessage, { foreignKey: "roomId", as: "messages" });
ChatMessage.belongsTo(ChatRoom, { foreignKey: "roomId", as: "room" });
ChatMessage.belongsTo(User, { foreignKey: "senderId", as: "sender" });
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
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/uploads", uploadRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/buyers/favorites", favoriteRoutes);
app.use("/api/v1/chat", chatRoutes);
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

  // Keep deployments safe when DB_SYNC is disabled. These additive changes
  // are required by the current order/rider and notification code and can be
  // applied repeatedly without affecting existing data.
  await sequelize.query(`
    ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS pickup_latitude DECIMAL(10,7);
    ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS pickup_longitude DECIMAL(10,7);
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY,
      recipient_user_id UUID NOT NULL,
      type VARCHAR(80) NOT NULL,
      title VARCHAR(180) NOT NULL,
      body TEXT NOT NULL,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS notifications_recipient_created_idx
      ON notifications (recipient_user_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS device_tokens (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL,
      expo_push_token VARCHAR(255) NOT NULL UNIQUE,
      platform VARCHAR(20),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS vendor_favorites (
      id UUID PRIMARY KEY,
      buyer_id UUID NOT NULL,
      vendor_id UUID NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (buyer_id, vendor_id)
    );
    CREATE TABLE IF NOT EXISTS chat_rooms (
      id UUID PRIMARY KEY,
      buyer_id UUID NOT NULL,
      vendor_id UUID NOT NULL,
      product_id UUID,
      order_id UUID,
      last_message_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS chat_messages (
      id UUID PRIMARY KEY,
      room_id UUID NOT NULL,
      sender_id UUID NOT NULL,
      body TEXT NOT NULL,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS chat_messages_room_created_idx
      ON chat_messages (room_id, created_at ASC);
  `);

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
