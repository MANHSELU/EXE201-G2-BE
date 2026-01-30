const mongoose = require("mongoose");

const cheatingReportSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  slotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ScheduleSlot",
    required: true,
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AttendanceSession",
    required: true,
  },
  type: {
    type: String,
    enum: [
      "SPOOFING_DETECTED", // Dùng ảnh/video giả
      "FACE_NOT_MATCH", // Khuôn mặt không khớp
      "LOCATION_FRAUD", // Gian lận vị trí
      "MULTIPLE_DEVICE", // Dùng nhiều thiết bị
      "OTHER",
    ],
    required: true,
  },
  evidence: {
    type: String, // Base64 ảnh hoặc link
  },
  description: {
    type: String,
  },
  status: {
    type: String,
    enum: ["PENDING", "REVIEWED", "CONFIRMED", "DISMISSED"],
    default: "PENDING",
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  reviewedAt: {
    type: Date,
  },
  reviewNote: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("CheatingReport", cheatingReportSchema);
