const ScheduleSlot = require("../../model/ScheduleSlot");
const AttendanceSession = require("../../model/AttendanceSession");
const AttendanceRecord = require("../../model/AttendanceRecord");
const ClassStudent = require("../../model/ClassStudent");

// GET /api/lecturer/reports/classes
// Lấy danh sách lớp mà giảng viên đang dạy (distinct từ ScheduleSlot)
module.exports.getReportClasses = async (req, res) => {
  try {
    const teacherId = req.userId;

    const slots = await ScheduleSlot.find({ teacherId })
      .populate("classId", "name")
      .populate("subjectId", "code name")
      .lean();

    // Group unique class+subject combos
    const map = new Map();
    for (const s of slots) {
      if (!s.classId || !s.subjectId) continue;
      const key = `${s.classId._id}_${s.subjectId._id}`;
      if (!map.has(key)) {
        map.set(key, {
          classId: s.classId._id,
          className: s.classId.name,
          subjectId: s.subjectId._id,
          subjectCode: s.subjectId.code,
          subjectName: s.subjectId.name,
        });
      }
    }

    return res.json({ data: Array.from(map.values()) });
  } catch (err) {
    console.error("[lecturer/reportClasses]", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/lecturer/reports/sessions?classId=xxx&subjectId=xxx
// Lấy lịch sử các phiên điểm danh của 1 lớp+môn
module.exports.getReportSessions = async (req, res) => {
  try {
    const teacherId = req.userId;
    const { classId, subjectId } = req.query;

    if (!classId) {
      return res.status(400).json({ message: "Thiếu classId" });
    }

    // Tìm tất cả slots của GV với lớp này
    const filter = { teacherId, classId };
    if (subjectId) filter.subjectId = subjectId;

    const slots = await ScheduleSlot.find(filter)
      .populate("roomId", "name")
      .populate("subjectId", "code name")
      .populate("classId", "name")
      .sort({ date: -1 })
      .lean();

    // Lấy tổng SV trong lớp
    const totalStudents = await ClassStudent.countDocuments({ classId });

    // Với mỗi slot, tìm session và đếm attendance
    const result = [];
    for (const slot of slots) {
      const session = await AttendanceSession.findOne({ slotId: slot._id, teacherId }).lean();

      let presentCount = 0, absentCount = 0, lateCount = 0;
      let sessionId = null;

      if (session) {
        sessionId = session._id;
        const records = await AttendanceRecord.find({ sessionId: session._id }).lean();
        presentCount = records.filter((r) => r.status === "PRESENT").length;
        lateCount = records.filter((r) => r.status === "LATE").length;
        absentCount = totalStudents - presentCount - lateCount;
        if (absentCount < 0) absentCount = 0;
      }

      result.push({
        _id: slot._id,
        sessionId,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        roomName: slot.roomId?.name || "",
        subjectCode: slot.subjectId?.code || "",
        subjectName: slot.subjectId?.name || "",
        className: slot.classId?.name || "",
        totalStudents,
        presentCount,
        absentCount,
        lateCount,
        hasAttendance: !!session,
      });
    }

    return res.json({ data: result });
  } catch (err) {
    console.error("[lecturer/reportSessions]", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/lecturer/reports/sessions/:sessionId/students
// Lấy chi tiết điểm danh từng SV trong phiên
module.exports.getReportSessionStudents = async (req, res) => {
  try {
    const teacherId = req.userId;
    const { sessionId } = req.params;

    const session = await AttendanceSession.findById(sessionId).lean();
    if (!session) return res.status(404).json({ message: "Không tìm thấy phiên điểm danh" });
    if (session.teacherId.toString() !== teacherId) {
      return res.status(403).json({ message: "Không có quyền xem phiên này" });
    }

    // Lấy slot để biết classId
    const slot = await ScheduleSlot.findById(session.slotId).lean();
    if (!slot) return res.status(404).json({ message: "Không tìm thấy buổi học" });

    // Lấy danh sách SV trong lớp
    const classStudents = await ClassStudent.find({ classId: slot.classId })
      .populate("studentId", "fullName email studentCode")
      .lean();

    // Lấy records điểm danh
    const records = await AttendanceRecord.find({ sessionId }).lean();
    const recordMap = new Map();
    for (const r of records) {
      recordMap.set(r.studentId.toString(), r);
    }

    // Merge: mỗi SV trong lớp + trạng thái điểm danh
    const result = classStudents.map((cs) => {
      const record = recordMap.get(cs.studentId._id.toString());
      return {
        _id: cs.studentId._id,
        studentName: cs.studentId.fullName,
        studentCode: cs.studentId.studentCode || cs.studentId.email,
        status: record ? record.status : "ABSENT",
        checkInTime: record?.checkinTime ? new Date(record.checkinTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : null,
        note: record?.status === "LATE" ? "Đi muộn" : record?.status === "INVALID_LOCATION" ? "Sai vị trí" : "",
      };
    });

    return res.json({ data: result });
  } catch (err) {
    console.error("[lecturer/reportStudents]", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
