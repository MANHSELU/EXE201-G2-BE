const mongoose = require("mongoose");

// Lịch học theo tuần cho lớp/sinh viên
const learningScheduleSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    dayOfWeek: {
      type: Number, // 1-7 (Thứ 2 -> CN)
      required: true,
      min: 1,
      max: 7,
    },
    startTime: {
      type: String, // "08:00"
      required: true,
    },
    endTime: {
      type: String, // "10:00"
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("LearningSchedule", learningScheduleSchema);

