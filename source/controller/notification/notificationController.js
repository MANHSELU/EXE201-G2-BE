const Notification = require("../../model/Notification");

const getMyNotifications = async (req, res) => {
  try {
    const notifs = await Notification.find({ userId: req.userId })
      .populate("fromUserId", "fullName role")
      .sort({ createdAt: -1 })
      .limit(30);
    res.json({ data: notifs });
  } catch (err) {
    res.status(500).json({ message: "Lỗi", error: err.message });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ userId: req.userId, read: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: "Lỗi", error: err.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.userId, read: false }, { read: true });
    res.json({ message: "OK" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi", error: err.message });
  }
};

// Helper: create notification + push via socket
const pushNotification = async (req, { userId, fromUserId, type, postId, message }) => {
  if (userId.toString() === fromUserId.toString()) return; // don't notify yourself
  const notif = await Notification.create({ userId, fromUserId, type, postId, message });
  const populated = await Notification.findById(notif._id).populate("fromUserId", "fullName role");

  const io = req.app.get("io");
  const onlineUsers = req.app.get("onlineUsers");
  const socketId = onlineUsers.get(userId.toString());
  if (socketId) {
    io.to(socketId).emit("notification", populated);
  }
};

module.exports = { getMyNotifications, getUnreadCount, markAsRead, pushNotification };
