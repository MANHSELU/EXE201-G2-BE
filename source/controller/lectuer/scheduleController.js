const ScheduleSlot = require("../../model/ScheduleSlot");
const TeachingSchedule = require("../../model/TeachingSchedule");
const Subject = require("../../model/Subject");
const ClassModel = require("../../model/Class");
const Room = require("../../model/Room");

// GET /api/lecturer/schedule/week
// Lịch dạy theo tuần từ TeachingSchedule (không theo ngày cụ thể)
module.exports.getWeeklyTeachingSchedule = async (req, res) => {
  try {
    const teacherId = req.userId;

    const schedules = await TeachingSchedule.find({ teacherId })
      .populate("subjectId")
      .lean();

    return res.json({ data: schedules });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/lecturer/slots/upcoming
// Các buổi dạy sắp tới theo ScheduleSlot (đã gắn ngày, phòng, lớp)
module.exports.getUpcomingTeachingSlots = async (req, res) => {
  try {
    const teacherId = req.userId;
    const now = new Date();

    const slots = await ScheduleSlot.find({
      teacherId,
      date: { $gte: now },
    })
      .sort({ date: 1, startTime: 1 })
      .limit(20)
      .populate("subjectId")
      .populate("classId")
      .populate("roomId")
      .lean();

    return res.json({ data: slots });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

