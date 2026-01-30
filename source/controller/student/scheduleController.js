const ClassStudent = require("../../model/ClassStudent");
const ScheduleSlot = require("../../model/ScheduleSlot");
const Subject = require("../../model/Subject");
const ClassModel = require("../../model/Class");
const Room = require("../../model/Room");

// GET /api/student/slots/upcoming
// Lấy TẤT CẢ lịch học của sinh viên (quá khứ, hiện tại, tương lai)
// Frontend sẽ tự xử lý hiển thị status dựa trên thời gian
module.exports.getUpcomingLearningSlots = async (req, res) => {
  try {
    const studentId = req.userId;

    // Tìm các lớp mà sinh viên thuộc về
    const classLinks = await ClassStudent.find({ studentId }).select("classId").lean();
    const classIds = classLinks.map((c) => c.classId);

    // Lấy tất cả slots của các lớp sinh viên, không filter theo ngày
    const slots = await ScheduleSlot.find({
      classId: { $in: classIds },
    })
      .sort({ date: 1, startTime: 1 })
      .populate("subjectId")
      .populate("classId")
      .populate("roomId")
      .populate("teacherId", "fullName email") // Thêm thông tin giáo viên
      .lean();

    return res.json({ data: slots });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

