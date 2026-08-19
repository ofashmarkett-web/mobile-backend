const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
module.exports = sequelize.define("ChatRoom", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  buyerId: { type: DataTypes.UUID, allowNull: false, field: "buyer_id" },
  vendorId: { type: DataTypes.UUID, allowNull: false, field: "vendor_id" },
  productId: { type: DataTypes.UUID, field: "product_id" },
  orderId: { type: DataTypes.UUID, field: "order_id" },
  lastMessageAt: { type: DataTypes.DATE, field: "last_message_at" },
}, { tableName: "chat_rooms", underscored: true, indexes: [{ unique: true, fields: ["buyer_id", "vendor_id", "product_id", "order_id"] }] });
