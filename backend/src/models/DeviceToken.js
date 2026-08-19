const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

module.exports = sequelize.define("DeviceToken", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false, field: "user_id" },
  expoPushToken: { type: DataTypes.STRING(255), allowNull: false, unique: true, field: "expo_push_token" },
  platform: { type: DataTypes.STRING(20) },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: "is_active" },
  lastSeenAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: "last_seen_at" },
}, { tableName: "device_tokens", underscored: true });
