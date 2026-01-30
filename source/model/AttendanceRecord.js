const mongoose = require("mongoose");

// Bản ghi điểm danh của sinh viên trong một phiên
const attendanceRecordSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AttendanceSession",
      required: true,
    },
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScheduleSlot",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["PRESENT", "ABSENT", "LATE", "INVALID_LOCATION"],
      required: true,
    },
    faceImageUrl: {
      type: String,
    },
    faceConfidence: {
      type: Number,
    },
    checkinTime: {
      type: Date,
      default: Date.now,
    },
    // Vị trí khi điểm danh
    locationLat: {
      type: Number,
    },
    locationLng: {
      type: Number,
    },
    // Liveness checks đã hoàn thành
    livenessCompleted: {
      type: String,
    },
  },
  { timestamps: true },
);

attendanceRecordSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model("AttendanceRecord", attendanceRecordSchema);

