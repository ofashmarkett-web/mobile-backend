const { Sequelize } = require("sequelize");
const dns = require("dns");
require("dotenv").config();

dns.setDefaultResultOrder("ipv4first");

const useSsl = process.env.DB_SSL !== "false";

/**
 * Fail before Sequelize attempts a connection when a provider URL was pasted
 * with an unescaped password. A password containing @, /, :, #, or a space
 * must be percent-encoded or it changes the URL's host/path components.
 */
const getDatabaseUrl = () => {
  const value = process.env.DATABASE_URL?.trim();

  if (!value) {
    throw new Error(
      "DATABASE_URL is not configured. Add the complete PostgreSQL connection string in Render.",
    );
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(
      "DATABASE_URL is not a valid PostgreSQL URL. Use postgresql://USER:ENCODED_PASSWORD@HOST:PORT/DATABASE.",
    );
  }

  if (!["postgres:", "postgresql:"].includes(parsed.protocol) || !parsed.hostname) {
    throw new Error(
      "DATABASE_URL must use postgresql://USER:ENCODED_PASSWORD@HOST:PORT/DATABASE.",
    );
  }

  return value;
};

const sequelize = new Sequelize(getDatabaseUrl(), {
  dialect: "postgres",
  protocol: "postgres",
  dialectOptions: useSsl
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : {},
  logging: process.env.DB_LOGGING === "true",
});

module.exports = sequelize;
