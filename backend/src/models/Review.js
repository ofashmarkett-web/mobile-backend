const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Review = sequelize.define(
  "Review",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    vendorId: { type: DataTypes.UUID, allowNull: false, field: "vendor_id" },
    buyerId: { type: DataTypes.UUID, allowNull: false, field: "buyer_id" },
    productId: { type: DataTypes.UUID, field: "product_id" },
    orderId: { type: DataTypes.UUID, field: "order_id" },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 },
    },
    comment: { type: DataTypes.TEXT },
  },
  {
    tableName: "reviews",
    underscored: true,
    indexes: [{ fields: ["vendor_id"] }, { fields: ["product_id"] }],
  },
);

module.exports = Review;
