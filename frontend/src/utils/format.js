import { COLORS } from "../theme/colors";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const naira = (value) => {
  const amount = Number(value || 0);
  return `₦${amount.toLocaleString("en-NG")}`;
};

export const formatDate = (iso) => {
  if (!iso) return "—";
  const date = new Date(iso);
  return `${DAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

export const formatTime = (iso) => {
  if (!iso) return "—";
  const date = new Date(iso);
  let hours = date.getHours();
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  const meridiem = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${meridiem}`;
};

export const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "?";

export const ORDER_STATUS_META = {
  pending: { label: "Pending", color: COLORS.amber, bg: COLORS.amberSoft },
  packaging: { label: "Packaging", color: COLORS.orange, bg: COLORS.orangeSoft },
  ready_for_pickup: { label: "Packaging", color: COLORS.orange, bg: COLORS.orangeSoft },
  shipped: { label: "Shipped", color: COLORS.teal, bg: COLORS.tealSoft },
  delivered: { label: "Delivered", color: COLORS.green, bg: COLORS.greenSoft },
  completed: { label: "Completed", color: COLORS.slate, bg: COLORS.grey },
  declined: { label: "Declined", color: COLORS.red, bg: COLORS.redSoft },
  cancelled: { label: "Cancelled", color: COLORS.red, bg: COLORS.redSoft },
};

export const DISPUTE_STATUS_META = {
  submitted: { label: "Submitted", color: COLORS.red, bg: COLORS.redSoft },
  under_review: { label: "Under review", color: COLORS.amber, bg: COLORS.amberSoft, dot: true },
  resolved: { label: "Resolved", color: COLORS.green, bg: COLORS.greenSoft },
};

// Relative time for "Filed 2 days ago" style labels.
export const timeAgo = (iso) => {
  if (!iso) return "—";
  const elapsed = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

export const STOCK_STATUS_META = {
  in_stock: { label: "In Stock", color: COLORS.green },
  low_stock: { label: "Low Stock", color: COLORS.amber },
  out_of_stock: { label: "Out of Stock", color: COLORS.red },
};

export const stockLine = (product) => {
  if (!product) return "";
  if (product.stockStatus === "out_of_stock") return "0 units available";
  return `${product.stockQuantity} unit${product.stockQuantity === 1 ? "" : "s"} available`;
};

export const priceLabel = (product) => {
  if (!product) return naira(0);
  if (product.usePriceRange && product.priceMin != null && product.priceMax != null) {
    return `${naira(product.priceMin)} - ${naira(product.priceMax)}`;
  }
  return naira(product.basePrice);
};
