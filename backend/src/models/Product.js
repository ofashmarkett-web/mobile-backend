const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Product = sequelize.define(
  "Product",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    vendorId: { type: DataTypes.UUID, allowNull: false, field: "vendor_id" },
    name: { type: DataTypes.STRING(180), allowNull: false },
    condition: {
      type: DataTypes.ENUM("new_with_tags", "thrift"),
      allowNull: false,
      defaultValue: "new_with_tags",
    },
    images: { type: DataTypes.JSONB, defaultValue: [] },
    usePriceRange: { type: DataTypes.BOOLEAN, defaultValue: false, field: "use_price_range" },
    basePrice: { type: DataTypes.INTEGER, field: "base_price" },
    priceMin: { type: DataTypes.INTEGER, field: "price_min" },
    priceMax: { type: DataTypes.INTEGER, field: "price_max" },
    sizes: { type: DataTypes.JSONB, defaultValue: [] },
    stockQuantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "stock_quantity" },
    lowStockThreshold: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2, field: "low_stock_threshold" },
    occasionTags: { type: DataTypes.JSONB, defaultValue: [], field: "occasion_tags" },
    styleTags: { type: DataTypes.JSONB, defaultValue: [], field: "style_tags" },
    customTags: { type: DataTypes.JSONB, defaultValue: [], field: "custom_tags" },
    measurements: { type: DataTypes.JSONB, defaultValue: {} },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: "is_active" },
    notifyOnRestock: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: "notify_on_restock" },
    unitsSold: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "units_sold" },
    viewsCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "views_count" },
    stockStatus: {
      type: DataTypes.VIRTUAL,
      get() {
        const quantity = this.getDataValue("stockQuantity");
        const threshold = this.getDataValue("lowStockThreshold") ?? 2;

        if (quantity <= 0) return "out_of_stock";
        if (quantity <= threshold) return "low_stock";
        return "in_stock";
      },
    },
  },
  {
    tableName: "products",
    underscored: true,
    indexes: [{ fields: ["vendor_id"] }, { fields: ["vendor_id", "is_active"] }],
  },
);

module.exports = Product;
