const { Sequelize } = require("sequelize");
const dns = require("dns");
require("dotenv").config();

dns.setDefaultResultOrder("ipv4first");

const useSsl = process.env.DB_SSL !== "false";

const sequelize = new Sequelize(process.env.DATABASE_URL, {
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
