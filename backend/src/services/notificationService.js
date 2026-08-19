const { Op } = require("sequelize");
const Notification = require("../models/Notification");
const DeviceToken = require("../models/DeviceToken");
const User = require("../models/User");
const RiderProfile = require("../models/RiderProfile");

const distanceKm = (a, b, c, d) => { const r = Math.PI / 180; const x = (c - a) * r; const y = (d - b) * r; const q = Math.sin(x / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(y / 2) ** 2; return 6371 * 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q)); };

const push = async (tokens, message) => {
  if (!tokens.length || !process.env.EXPO_ACCESS_TOKEN) return;
  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` },
      body: JSON.stringify(tokens.map(to => ({ to, sound: "default", title: message.title, body: message.body, data: message.data }))),
    });
    if (!response.ok) throw new Error(`Expo push failed (${response.status})`);
  } catch (error) { console.error("Push notification delivery failed:", error.message); }
};

const create = async ({ recipientUserId, type, title, body, data = {} }) => {
  const notification = await Notification.create({ recipientUserId, type, title, body, data });
  const devices = await DeviceToken.findAll({ where: { userId: recipientUserId, isActive: true }, attributes: ["expoPushToken"] });
  await push(devices.map(device => device.expoPushToken), { title, body, data: { ...data, notificationId: notification.id } });
  return notification;
};

const createForUsers = async (userIds, payload) => Promise.all([...new Set(userIds.filter(Boolean))].map(recipientUserId => create({ recipientUserId, ...payload })));

const orderEvent = async (order, previousStatus, status) => {
  if (previousStatus === status) return;
  const product = order.productName || "your order";
  const base = { data: { orderId: order.id, orderNo: order.orderNo } };
  const events = {
    pending: { type: "order_created", title: "Order confirmed", body: `${product} is waiting for the vendor to accept.` },
    packaging: { type: "order_accepted", title: "Order accepted", body: `The vendor accepted ${product} and is preparing it.` },
    ready_for_pickup: { type: "order_ready", title: "Ready for pickup", body: `${product} has been packed and is waiting for a rider.` },
    shipped: { type: "order_shipped", title: "Your order is on the way", body: `${product} has been picked up by a rider.` },
    delivered: { type: "order_delivered", title: "Order delivered", body: `${product} has been marked delivered. Please confirm receipt.` },
    completed: { type: "payment_released", title: "Payment released", body: `Payment for ${product} has been released.` },
    declined: { type: "order_declined", title: "Order declined", body: `${product} was declined and your payment will be refunded.` },
  };
  const event = events[status];
  if (!event) return;
  const audience = status === "ready_for_pickup" ? [order.buyerId, order.vendorId] : [order.buyerId, order.vendorId, order.riderId];
  await createForUsers(audience, { ...event, ...base });
  if (status === "ready_for_pickup") {
    const riders = await RiderProfile.findAll({ where: { kycStatus: "verified" }, attributes: ["userId", "latitude", "longitude"], include: [{ model: User, as: "user", where: { role: "rider", isKycVerified: true }, attributes: [] }] });
    const nearby = riders.filter(rider => !order.pickupLatitude || !rider.latitude || distanceKm(Number(rider.latitude), Number(rider.longitude), Number(order.pickupLatitude), Number(order.pickupLongitude)) <= Number(process.env.RIDER_MATCH_RADIUS_KM || 5));
    await createForUsers(nearby.map(rider => rider.userId), { type: "nearby_delivery", title: "Delivery available", body: `${product} is ready for pickup. Open deliveries to claim it.`, ...base });
  }
};

module.exports = { create, createForUsers, orderEvent };
