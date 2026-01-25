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
      enum: ["PRESENT", "ABSENT", "LATE"],
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
  },
  { timestamps: true },
);

attendanceRecordSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model("AttendanceRecord", attendanceRecordSchema);

