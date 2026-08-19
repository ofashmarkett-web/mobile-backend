const { Op } = require("sequelize");
const ChatRoom = require("../models/ChatRoom");
const ChatMessage = require("../models/ChatMessage");
const User = require("../models/User");
const Product = require("../models/Product");
const { create } = require("../services/notificationService");

const reject = (status, message) => Object.assign(new Error(message), { statusCode: status });
const participantWhere = (userId) => ({ [Op.or]: [{ buyerId: userId }, { vendorId: userId }] });
const roomFor = async (id, userId) => { const room = await ChatRoom.findOne({ where: { id, ...participantWhere(userId) } }); if (!room) throw reject(404, "Chat room not found"); return room; };

const createRoom = async (req, res, next) => {
  try {
    if (req.user.role === "vendor" && req.body.orderId) {
      const existing = await ChatRoom.findOne({ where: { vendorId: req.user.id, orderId: req.body.orderId } });
      if (!existing) throw reject(404, "This order does not have a chat room yet");
      return res.status(200).json({ success: true, room: existing });
    }
    if (req.user.role !== "buyer") throw reject(403, "Only buyers can start a chat");
    const vendor = await User.findOne({ where: { id: req.body.vendorId, role: "vendor" } }); if (!vendor) throw reject(404, "Vendor not found");
    const [room] = await ChatRoom.findOrCreate({ where: { buyerId: req.user.id, vendorId: vendor.id, productId: req.body.productId || null, orderId: req.body.orderId || null }, defaults: { buyerId: req.user.id, vendorId: vendor.id, productId: req.body.productId || null, orderId: req.body.orderId || null } });
    return res.status(201).json({ success: true, room });
  } catch (error) { return next(error); }
};
const listRooms = async (req, res, next) => { try { const rooms = await ChatRoom.findAll({ where: participantWhere(req.user.id), order: [["last_message_at", "DESC"], ["created_at", "DESC"]] }); return res.json({ success: true, rooms }); } catch (error) { return next(error); } };
const listMessages = async (req, res, next) => { try { const room = await roomFor(req.params.id, req.user.id); const messages = await ChatMessage.findAll({ where: { roomId: room.id }, order: [["created_at", "ASC"]], limit: 200 }); await ChatMessage.update({ readAt: new Date() }, { where: { roomId: room.id, senderId: { [Op.ne]: req.user.id }, readAt: null } }); return res.json({ success: true, room, messages }); } catch (error) { return next(error); } };
const sendMessage = async (req, res, next) => {
  try {
    const room = await roomFor(req.params.id, req.user.id); const body = String(req.body.body || "").trim();
    if (!body || body.length > 2000) throw reject(400, "Message must be between 1 and 2,000 characters");
    if (/(https?:\/\/|www\.|\b\S+@\S+\.\S+|\+?\d[\d\s().-]{7,})/i.test(body)) throw reject(400, "For your safety, links, phone numbers and email addresses are not allowed in chat");
    if (/(bank|account number|transfer|pay me|whatsapp|telegram|instagram|send money|crypto)/i.test(body)) throw reject(400, "Keep payments and communication inside O-Fash Markett");
    const message = await ChatMessage.create({ roomId: room.id, senderId: req.user.id, body }); await room.update({ lastMessageAt: new Date() });
    const recipientUserId = req.user.id === room.buyerId ? room.vendorId : room.buyerId;
    await create({ recipientUserId, type: "chat_message", title: "New chat message", body: body.slice(0, 120), data: { roomId: room.id } });
    return res.status(201).json({ success: true, message });
  } catch (error) { return next(error); }
};
module.exports = { createRoom, listRooms, listMessages, sendMessage };
