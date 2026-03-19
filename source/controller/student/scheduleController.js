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

// GET /api/student/slots/available-for-leave
// Lấy các slot chưa bắt đầu (để sinh viên xin vắng)
module.exports.getAvailableSlotsForLeave = async (req, res) => {
  try {
    const studentId = req.userId;
    const now = new Date();

    console.log("\n=== DEBUG: getAvailableSlotsForLeave ===");
    console.log("Current Student ID (from JWT):", studentId);
    console.log("Current Time:", now.toISOString());

    // Tìm các lớp mà sinh viên thuộc về
    const classLinks = await ClassStudent.find({ studentId }).select("classId").lean();
    console.log("ClassStudent records found:", classLinks.length);
    console.log("ClassStudent records debug:", JSON.stringify(classLinks, null, 2));

    if (!classLinks || classLinks.length === 0) {
      console.log("❌ PROBLEM: Student not enrolled in any classes!");
      return res.json({ data: [], debug: "Student not in any class" });
    }

    const classIds = classLinks.map((c) => c.classId);
    console.log("ClassIds for student:", classIds);

    // Lấy tất cả slots của các lớp sinh viên
    const allSlots = await ScheduleSlot.find({
      classId: { $in: classIds },
    })
      .sort({ date: 1, startTime: 1 })
      .populate("subjectId")
      .populate("classId")
      .populate("roomId")
      .populate("teacherId", "fullName email")
      .lean();

    console.log("Total ScheduleSlots found:", allSlots.length);
    if (allSlots.length > 0) {
      console.log("First slot:", JSON.stringify(allSlots[0], null, 2));
    }

    // Filter chỉ lấy slots chưa bắt đầu
    const availableSlots = allSlots.filter((slot) => {
      // slot.date là Date object, convert thành YYYY-MM-DD format
      const dateStr = slot.date.toISOString().split('T')[0]; // "2026-03-12"
      const slotDateTime = new Date(`${dateStr}T${slot.startTime}:00`);
      const isAvailable = slotDateTime > now;
      const status = isAvailable ? "✅ AVAILABLE" : "❌ EXPIRED";
      console.log(`${status} - Slot: ${slot.subjectId?.code || "?"} | ${dateStr} ${slot.startTime} | ${slotDateTime.toISOString()}`);
      return isAvailable;
    });

    console.log(`Final available slots: ${availableSlots.length}`);
    console.log("=== END DEBUG ===\n");

    return res.json({ data: availableSlots });
  } catch (err) {
    console.error("❌ Error fetching available slots:", err);
    return res.status(500).json({ message: "Internal server error", error: err.message });
  }
};
