const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Dispute = sequelize.define(
  "Dispute",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    orderId: { type: DataTypes.UUID, allowNull: false, unique: true, field: "order_id" },
    vendorId: { type: DataTypes.UUID, allowNull: false, field: "vendor_id" },
    buyerId: { type: DataTypes.UUID, allowNull: false, field: "buyer_id" },
    reason: { type: DataTypes.STRING(64), allowNull: false },
    detail: { type: DataTypes.TEXT },
    evidenceImages: { type: DataTypes.JSONB, defaultValue: [], field: "evidence_images" },
    amountHeld: { type: DataTypes.INTEGER, allowNull: false, field: "amount_held" },
    status: {
      type: DataTypes.ENUM("submitted", "under_review", "resolved"),
      allowNull: false,
      defaultValue: "submitted",
    },
    resolutionNote: { type: DataTypes.TEXT, field: "resolution_note" },
    resolvedAt: { type: DataTypes.DATE, field: "resolved_at" },
  },
  {
    tableName: "disputes",
    underscored: true,
    indexes: [{ fields: ["vendor_id", "status"] }, { fields: ["buyer_id"] }],
  },
);

module.exports = Dispute;
