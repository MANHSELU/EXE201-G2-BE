const mongoose = require("mongoose");

// Phiên điểm danh do giảng viên tạo (QR code)
const attendanceSessionSchema = new mongoose.Schema(
  {
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScheduleSlot",
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    codeHash: {
      type: String,
      required: true,
      select: false,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

attendanceSessionSchema.index({ slotId: 1, teacherId: 1 });

module.exports = mongoose.model("AttendanceSession", attendanceSessionSchema);

