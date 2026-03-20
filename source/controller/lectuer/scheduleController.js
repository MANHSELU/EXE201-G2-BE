const ScheduleSlot = require("../../model/ScheduleSlot");
const AttendanceSession = require("../../model/AttendanceSession");
const Subject = require("../../model/Subject");
const ClassModel = require("../../model/Class");
const Room = require("../../model/Room");

// GET /api/lecturer/slots/upcoming
// Lấy TẤT CẢ lịch dạy của giáo viên (quá khứ, hiện tại, tương lai)
// Frontend sẽ tự xử lý hiển thị status dựa trên thời gian
module.exports.getUpcomingTeachingSlots = async (req, res) => {
  try {
    const teacherId = req.userId;

    const slots = await ScheduleSlot.find({ teacherId })
      .sort({ date: 1, startTime: 1 })
      .populate("subjectId")
      .populate("classId")
      .populate("roomId")
      .lean();

    // Check xem slot nào đã tạo mã điểm danh
    const slotIds = slots.map((s) => s._id);
    const sessions = await AttendanceSession.find({ slotId: { $in: slotIds }, teacherId }).lean();
    const sessionMap = new Set(sessions.map((s) => s.slotId.toString()));

    const result = slots.map((s) => ({
      ...s,
      hasAttendanceSession: sessionMap.has(s._id.toString()),
    }));

    return res.json({ data: result });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

