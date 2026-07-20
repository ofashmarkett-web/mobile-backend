const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Order = sequelize.define(
  "Order",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    orderNo: { type: DataTypes.STRING(24), allowNull: false, unique: true, field: "order_no" },
    vendorId: { type: DataTypes.UUID, allowNull: false, field: "vendor_id" },
    buyerId: { type: DataTypes.UUID, allowNull: false, field: "buyer_id" },
    productId: { type: DataTypes.UUID, field: "product_id" },
    riderId: { type: DataTypes.UUID, field: "rider_id" },
    productName: { type: DataTypes.STRING(180), allowNull: false, field: "product_name" },
    productImageUrl: { type: DataTypes.TEXT, field: "product_image_url" },
    size: { type: DataTypes.STRING(16) },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    unitPrice: { type: DataTypes.INTEGER, allowNull: false, field: "unit_price" },
    orderAmount: { type: DataTypes.INTEGER, allowNull: false, field: "order_amount" },
    platformFeePct: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 5, field: "platform_fee_pct" },
    platformFee: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "platform_fee" },
    vendorReceives: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "vendor_receives" },
    status: {
      type: DataTypes.ENUM(
        "pending",
        "packaging",
        "ready_for_pickup",
        "shipped",
        "delivered",
        "completed",
        "declined",
        "cancelled",
      ),
      allowNull: false,
      defaultValue: "pending",
    },
    escrowStatus: {
      type: DataTypes.ENUM("held", "released", "refunded"),
      allowNull: false,
      defaultValue: "held",
      field: "escrow_status",
    },
    pickupCode: { type: DataTypes.STRING(16), field: "pickup_code" },
    deliveryAddress: { type: DataTypes.TEXT, field: "delivery_address" },
    acceptedAt: { type: DataTypes.DATE, field: "accepted_at" },
    packedAt: { type: DataTypes.DATE, field: "packed_at" },
    pickedUpAt: { type: DataTypes.DATE, field: "picked_up_at" },
    deliveredAt: { type: DataTypes.DATE, field: "delivered_at" },
    autoReleaseAt: { type: DataTypes.DATE, field: "auto_release_at" },
    completedAt: { type: DataTypes.DATE, field: "completed_at" },
    declinedAt: { type: DataTypes.DATE, field: "declined_at" },
  },
  {
    tableName: "orders",
    underscored: true,
    indexes: [
      { fields: ["vendor_id", "status"] },
      { fields: ["buyer_id"] },
      { fields: ["status", "auto_release_at"] },
    ],
  },
);

module.exports = Order;
