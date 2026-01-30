const ScheduleSlot = require("../../model/ScheduleSlot");
const Subject = require("../../model/Subject");
const ClassModel = require("../../model/Class");
const Room = require("../../model/Room");

// GET /api/lecturer/slots/upcoming
// Lấy TẤT CẢ lịch dạy của giáo viên (quá khứ, hiện tại, tương lai)
// Frontend sẽ tự xử lý hiển thị status dựa trên thời gian
module.exports.getUpcomingTeachingSlots = async (req, res) => {
  try {
    const teacherId = req.userId;

    // Lấy tất cả slots của giáo viên, không filter theo ngày
    const slots = await ScheduleSlot.find({ teacherId })
      .sort({ date: 1, startTime: 1 })
      .populate("subjectId")
      .populate("classId")
      .populate("roomId")
      .lean();

    return res.json({ data: slots });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

