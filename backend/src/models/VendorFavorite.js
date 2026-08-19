const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
module.exports = sequelize.define("VendorFavorite", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  buyerId: { type: DataTypes.UUID, allowNull: false, field: "buyer_id" },
  vendorId: { type: DataTypes.UUID, allowNull: false, field: "vendor_id" },
}, { tableName: "vendor_favorites", underscored: true, indexes: [{ unique: true, fields: ["buyer_id", "vendor_id"] }] });
