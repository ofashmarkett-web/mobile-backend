const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const VendorProfile = sequelize.define(
  "VendorProfile",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false, unique: true, field: "user_id" },
    fullName: { type: DataTypes.STRING(160), field: "full_name" },
    businessName: { type: DataTypes.STRING(180), allowNull: false, field: "business_name" },
    storeHandle: { type: DataTypes.STRING(80), field: "store_handle" },
    isLive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: "is_live" },
    businessEmail: { type: DataTypes.STRING(254), field: "business_email" },
    description: { type: DataTypes.TEXT },
    categories: { type: DataTypes.JSONB, defaultValue: [] },
    cacNumber: { type: DataTypes.STRING(64), field: "cac_number" },
    cacCertificateUrl: { type: DataTypes.TEXT, field: "cac_certificate_url" },
    // Optional trust badge: outcome of the CAC registration-number lookup.
    // Never gates vendor approval — see onboardingController.coreKycChecks.
    cacStatus: {
      type: DataTypes.ENUM("not_started", "pending", "verified", "failed"),
      defaultValue: "not_started",
      field: "cac_status",
    },
    storeLogoUrl: { type: DataTypes.TEXT, field: "store_logo_url" },
    storeBannerUrl: { type: DataTypes.TEXT, field: "store_banner_url" },
    address: { type: DataTypes.TEXT },
    landmark: { type: DataTypes.STRING(180) },
    latitude: { type: DataTypes.DECIMAL(10, 7) },
    longitude: { type: DataTypes.DECIMAL(10, 7) },
    openingDays: { type: DataTypes.JSONB, defaultValue: [], field: "opening_days" },
    deliveryType: { type: DataTypes.STRING(64), field: "delivery_type" },
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
    // NIN encrypted at rest (AES-256-GCM via utils/secureField), saved when the
    // NIN check verifies — required for QoreID's face-match liveness call.
    ninEncrypted: { type: DataTypes.TEXT, field: "nin_encrypted" },
    // Uploaded ID document image, retained as supporting evidence only —
    // identity is proven by the NIN lookup + face-match, not this image.
    documentImageUrl: { type: DataTypes.TEXT, field: "document_image_url" },
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
  { tableName: "vendor_profiles", underscored: true },
);

module.exports = VendorProfile;
