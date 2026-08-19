const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
module.exports = sequelize.define("ChatMessage", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  roomId: { type: DataTypes.UUID, allowNull: false, field: "room_id" },
  senderId: { type: DataTypes.UUID, allowNull: false, field: "sender_id" },
  body: { type: DataTypes.TEXT, allowNull: false },
  readAt: { type: DataTypes.DATE, field: "read_at" },
}, { tableName: "chat_messages", underscored: true, indexes: [{ fields: ["room_id", "created_at"] }] });
