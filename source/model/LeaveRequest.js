const mongoose = require("mongoose");

// Đơn xin vắng của sinh viên
const leaveRequestSchema = new mongoose.Schema(
  {
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
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    proofImageUrl: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
    requestDate: {
      type: Date,
      default: Date.now,
    },
    responseDate: {
      type: Date,
    },
    // Giáo viên response
    responseNote: {
      type: String,
    },
  },
  { timestamps: true },
);

// Unique: mỗi sinh viên chỉ được gửi 1 đơn xin vắng cho 1 slot
leaveRequestSchema.index({ slotId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model("LeaveRequest", leaveRequestSchema);
