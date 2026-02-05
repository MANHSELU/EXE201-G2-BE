const mongoose = require("mongoose");

// Lịch dạy theo tuần cho giảng viên
const teachingScheduleSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    dayOfWeek: {
      type: Number, 
      required: true,
      min: 1,
      max: 7,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("TeachingSchedule", teachingScheduleSchema);

