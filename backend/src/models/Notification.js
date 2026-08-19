const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

module.exports = sequelize.define("Notification", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  recipientUserId: { type: DataTypes.UUID, allowNull: false, field: "recipient_user_id" },
  type: { type: DataTypes.STRING(80), allowNull: false },
  title: { type: DataTypes.STRING(180), allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: false },
  data: { type: DataTypes.JSONB, defaultValue: {} },
  readAt: { type: DataTypes.DATE, field: "read_at" },
}, { tableName: "notifications", underscored: true, indexes: [{ fields: ["recipient_user_id", "created_at"] }] });
