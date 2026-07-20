const { DataTypes } = require("sequelize");
const bcrypt = require("bcryptjs");
const sequelize = require("../config/database");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(254),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    phone: {
      type: DataTypes.STRING(32),
      allowNull: false,
      unique: true,
    },
    passwordHash: {
      type: DataTypes.STRING(128),
      allowNull: false,
      field: "password_hash",
    },
    role: {
      type: DataTypes.ENUM("buyer", "vendor", "rider"),
      allowNull: false,
      defaultValue: "buyer",
    },
    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_email_verified",
    },
    isKycVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_kyc_verified",
    },
  },
  {
    tableName: "users",
    underscored: true,
    indexes: [
      { unique: true, fields: ["email"] },
      { unique: true, fields: ["phone"] },
      { fields: ["role"] },
      { fields: ["is_kyc_verified"] },
    ],
  },
);

User.beforeSave(async (user) => {
  if (user.changed("passwordHash") && !user.passwordHash.startsWith("$2")) {
    user.passwordHash = await bcrypt.hash(user.passwordHash, 10);
  }
});

User.prototype.matchPassword = function matchPassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

module.exports = User;
