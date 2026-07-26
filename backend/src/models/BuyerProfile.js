const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const BuyerProfile = sequelize.define(
  "BuyerProfile",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false, unique: true, field: "user_id" },
    fullName: { type: DataTypes.STRING(160), allowNull: false, field: "full_name" },
    dateOfBirth: { type: DataTypes.STRING(32), field: "date_of_birth" },
    gender: { type: DataTypes.STRING(24) },
    referral: { type: DataTypes.STRING(160) },
    defaultAddress: { type: DataTypes.TEXT, field: "default_address" },
    // Saved only when the buyer taps "Allow location access" — powers the
    // distance-based "Near You" vendor tag.
    latitude: { type: DataTypes.DECIMAL(10, 7) },
    longitude: { type: DataTypes.DECIMAL(10, 7) },
    onboardingStatus: {
      type: DataTypes.ENUM("draft", "submitted", "active"),
      defaultValue: "draft",
      field: "onboarding_status",
    },
  },
  { tableName: "buyer_profiles", underscored: true },
);

module.exports = BuyerProfile;
