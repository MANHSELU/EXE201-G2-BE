const ClassStudent = require("../../model/ClassStudent");
const ScheduleSlot = require("../../model/ScheduleSlot");
const Semester = require("../../model/Semester");
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

// GET /api/student/semesters
// Lấy danh sách kì học mà sinh viên có lịch (có ít nhất 1 slot thuộc lớp của SV)
module.exports.getSemesters = async (req, res) => {
  try {
    const studentId = req.userId;
    const classLinks = await ClassStudent.find({ studentId }).select("classId").lean();
    const classIds = classLinks.map((c) => c.classId).filter(Boolean);
    if (classIds.length === 0) return res.json({ data: [] });
    let slotSemesterIds = await ScheduleSlot.distinct("semesterId", { classId: { $in: classIds } });
    if (!Array.isArray(slotSemesterIds)) slotSemesterIds = [];
    slotSemesterIds = slotSemesterIds.filter(Boolean);
    if (slotSemesterIds.length === 0) return res.json({ data: [] });
    const semesters = await Semester.find({ _id: { $in: slotSemesterIds } }).sort({ startDate: -1 }).lean();
    return res.json({ data: semesters || [] });
  } catch (err) {
    console.error("[getSemesters]", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

