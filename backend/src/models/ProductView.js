const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ProductView = sequelize.define(
  "ProductView",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    productId: { type: DataTypes.UUID, allowNull: false, field: "product_id" },
    vendorId: { type: DataTypes.UUID, allowNull: false, field: "vendor_id" },
    viewerId: { type: DataTypes.UUID, field: "viewer_id" },
  },
  {
    tableName: "product_views",
    underscored: true,
    updatedAt: false,
    indexes: [
      { fields: ["vendor_id", "created_at"] },
      { fields: ["product_id", "created_at"] },
    ],
  },
);

module.exports = ProductView;
