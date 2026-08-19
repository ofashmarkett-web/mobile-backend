const { Op } = require("sequelize");
const Notification = require("../models/Notification");
const DeviceToken = require("../models/DeviceToken");
const RiderProfile = require("../models/RiderProfile");

const list = async (req, res, next) => {
  try { const items = await Notification.findAll({ where: { recipientUserId: req.user.id }, order: [["created_at", "DESC"]], limit: 100 }); return res.json({ success: true, items }); } catch (error) { return next(error); }
};
const registerDevice = async (req, res, next) => {
  try { const { expoPushToken, platform } = req.body; if (!expoPushToken) return res.status(400).json({ success: false, message: "expoPushToken is required" }); const [device] = await DeviceToken.findOrCreate({ where: { expoPushToken }, defaults: { userId: req.user.id, platform, isActive: true, lastSeenAt: new Date() } }); await device.update({ userId: req.user.id, platform, isActive: true, lastSeenAt: new Date() }); return res.json({ success: true }); } catch (error) { return next(error); }
};
const markRead = async (req, res, next) => { try { await Notification.update({ readAt: new Date() }, { where: { id: req.params.id, recipientUserId: req.user.id, readAt: { [Op.is]: null } } }); return res.json({ success: true }); } catch (error) { return next(error); } };
const markAllRead = async (req, res, next) => { try { await Notification.update({ readAt: new Date() }, { where: { recipientUserId: req.user.id, readAt: { [Op.is]: null } } }); return res.json({ success: true }); } catch (error) { return next(error); } };
const updateRiderLocation = async (req, res, next) => { try { if (req.user.role !== "rider") return res.status(403).json({ success: false, message: "Rider account required" }); const latitude = Number(req.body.latitude); const longitude = Number(req.body.longitude); if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return res.status(400).json({ success: false, message: "Valid latitude and longitude are required" }); await RiderProfile.update({ latitude, longitude }, { where: { userId: req.user.id } }); return res.json({ success: true }); } catch (error) { return next(error); } };
module.exports = { list, registerDevice, markRead, markAllRead, updateRiderLocation };
