const Semester = require("../../model/Semester");
const ScheduleSlot = require("../../model/ScheduleSlot");
const ClassStudent = require("../../model/ClassStudent");
const AttendanceRecord = require("../../model/AttendanceRecord");

// GET /api/student/semesters
// Trả về danh sách kì học mà sinh viên có lịch (dựa trên lớp sinh viên đang học)
module.exports.getSemesters = async (req, res) => {
  try {
    const studentId = req.userId;

    // Tìm các lớp mà sinh viên thuộc về
    const classLinks = await ClassStudent.find({ studentId }).select("classId").lean();
    const classIds = classLinks.map((c) => c.classId);

    if (classIds.length === 0) {
      return res.json({ data: [] });
    }

    // Tìm tất cả semesterId duy nhất từ slots của các lớp sinh viên
    const semesterIds = await ScheduleSlot.distinct("semesterId", {
      classId: { $in: classIds },
      semesterId: { $ne: null },
    });

    if (semesterIds.length === 0) {
      // Nếu không có slot nào có semesterId, trả về tất cả semesters
      const allSemesters = await Semester.find().sort({ startDate: -1 }).lean();
      return res.json({ data: allSemesters });
    }

    const semesters = await Semester.find({ _id: { $in: semesterIds } })
      .sort({ startDate: -1 })
      .lean();

    return res.json({ data: semesters });
  } catch (err) {
    console.error("[getSemesters] Error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/student/attendance/report-by-semester?semesterId=xxx
// Trả về báo cáo điểm danh theo kì, nhóm theo môn
module.exports.getReportBySemester = async (req, res) => {
  try {
    const studentId = req.userId;
    const { semesterId } = req.query;

    if (!semesterId) {
      return res.status(400).json({ message: "Thiếu semesterId" });
    }

    // Lấy thông tin kì học
    const semester = await Semester.findById(semesterId).lean();
    if (!semester) {
      return res.status(404).json({ message: "Không tìm thấy kì học" });
    }

    // Tìm các lớp mà sinh viên thuộc về
    const classLinks = await ClassStudent.find({ studentId }).select("classId").lean();
    const classIds = classLinks.map((c) => c.classId);

    if (classIds.length === 0) {
      return res.json({
        data: {
          semester,
          bySubject: [],
        },
      });
    }

    // Tìm tất cả slots trong kì này thuộc lớp sinh viên
    // Nếu slot có semesterId thì dùng, nếu không thì filter theo ngày kì
    const slotQuery = {
      classId: { $in: classIds },
      $or: [
        { semesterId: semesterId },
        {
          semesterId: { $exists: false },
          date: { $gte: semester.startDate, $lte: semester.endDate },
        },
        {
          semesterId: null,
          date: { $gte: semester.startDate, $lte: semester.endDate },
        },
      ],
    };

    const slots = await ScheduleSlot.find(slotQuery)
      .populate("subjectId", "code name")
      .sort({ date: 1 })
      .lean();

    if (slots.length === 0) {
      return res.json({
        data: {
          semester,
          bySubject: [],
        },
      });
    }

    const slotIds = slots.map((s) => s._id);

    // Lấy tất cả attendance records của sinh viên cho các slot này
    const records = await AttendanceRecord.find({
      studentId,
      slotId: { $in: slotIds },
    }).lean();

    const recordMap = {};
    for (const r of records) {
      recordMap[String(r.slotId)] = r;
    }

    // Nhóm slots theo subjectId
    const subjectMap = {};
    for (const slot of slots) {
      const subId = String(slot.subjectId?._id || slot.subjectId);
      if (!subjectMap[subId]) {
        subjectMap[subId] = {
          subjectId: subId,
          subjectCode: slot.subjectId?.code || "N/A",
          subjectName: slot.subjectId?.name || "N/A",
          totalSlotsInSemester: 0,
          takenSlots: 0,
          presentCount: 0,
          absentCount: 0,
          lateCount: 0,
          allowedAbsent: 0,
          firstDate: null,
          lastDate: null,
        };
      }

      const sub = subjectMap[subId];
      sub.totalSlotsInSemester++;

      const slotDate = slot.date ? new Date(slot.date).toISOString() : null;
      if (slotDate) {
        if (!sub.firstDate || slotDate < sub.firstDate) sub.firstDate = slotDate;
        if (!sub.lastDate || slotDate > sub.lastDate) sub.lastDate = slotDate;
      }

      // Kiểm tra nếu slot đã qua (tính cả hôm nay)
      const slotDateObj = new Date(slot.date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      if (slotDateObj <= today) {
        sub.takenSlots++;
        const record = recordMap[String(slot._id)];
        if (record) {
          if (record.status === "PRESENT") sub.presentCount++;
          else if (record.status === "LATE") {
            sub.lateCount++;
            sub.presentCount++; // LATE vẫn tính có mặt
          } else {
            sub.absentCount++;
          }
        } else {
          sub.absentCount++; // Không có record = vắng
        }
      }
    }

    // Tính allowedAbsent = 20% tổng số buổi đã điểm danh
    const bySubject = Object.values(subjectMap).map((sub) => ({
      ...sub,
      allowedAbsent: Math.floor(sub.takenSlots * 0.2),
    }));

    return res.json({
      data: {
        semester,
        bySubject,
      },
    });
  } catch (err) {
    console.error("[getReportBySemester] Error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
