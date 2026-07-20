const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const RiderProfile = sequelize.define(
  "RiderProfile",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false, unique: true, field: "user_id" },
    fullName: { type: DataTypes.STRING(160), allowNull: false, field: "full_name" },
    dateOfBirth: { type: DataTypes.STRING(32), field: "date_of_birth" },
    gender: { type: DataTypes.STRING(24) },
    address: { type: DataTypes.TEXT },
    latitude: { type: DataTypes.DECIMAL(10, 7) },
    longitude: { type: DataTypes.DECIMAL(10, 7) },
    vehicleType: { type: DataTypes.STRING(80), field: "vehicle_type" },
    plateNumber: { type: DataTypes.STRING(40), field: "plate_number" },
    licenseNumber: { type: DataTypes.STRING(80), field: "license_number" },
    deliveryCompany: { type: DataTypes.STRING(160), field: "delivery_company" },
    coverageAreas: { type: DataTypes.JSONB, defaultValue: [], field: "coverage_areas" },
    bankName: { type: DataTypes.STRING(120), field: "bank_name" },
    accountNumber: { type: DataTypes.STRING(32), field: "account_number" },
    accountName: { type: DataTypes.STRING(160), field: "account_name" },
    kycStatus: {
      type: DataTypes.ENUM("not_started", "pending", "verified", "failed", "manual_review"),
      defaultValue: "not_started",
      field: "kyc_status",
    },
    bvnStatus: {
      type: DataTypes.ENUM("not_started", "pending", "verified", "failed", "manual_review"),
      defaultValue: "not_started",
      field: "bvn_status",
    },
    ninStatus: {
      type: DataTypes.ENUM("not_started", "pending", "verified", "failed", "manual_review"),
      defaultValue: "not_started",
      field: "nin_status",
    },
    documentStatus: {
      type: DataTypes.ENUM("not_started", "pending", "verified", "failed", "manual_review"),
      defaultValue: "not_started",
      field: "document_status",
    },
    livenessStatus: {
      type: DataTypes.ENUM("not_started", "pending", "verified", "failed", "manual_review"),
      defaultValue: "not_started",
      field: "liveness_status",
    },
    dojahReference: { type: DataTypes.STRING(160), field: "dojah_reference" },
    bvnReference: { type: DataTypes.STRING(160), field: "bvn_reference" },
    ninReference: { type: DataTypes.STRING(160), field: "nin_reference" },
    documentReference: { type: DataTypes.STRING(160), field: "document_reference" },
    livenessReference: { type: DataTypes.STRING(160), field: "liveness_reference" },
    onboardingStatus: {
      type: DataTypes.ENUM("draft", "submitted", "approved", "rejected"),
      defaultValue: "draft",
      field: "onboarding_status",
    },
  },
  { tableName: "rider_profiles", underscored: true },
);

module.exports = RiderProfile;
