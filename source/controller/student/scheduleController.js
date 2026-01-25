const ClassStudent = require("../../model/ClassStudent");
const LearningSchedule = require("../../model/LearningSchedule");
const ScheduleSlot = require("../../model/ScheduleSlot");
const Subject = require("../../model/Subject");
const ClassModel = require("../../model/Class");
const Room = require("../../model/Room");

// GET /api/student/schedule/week
module.exports.getWeeklyLearningSchedule = async (req, res) => {
  try {
    const studentId = req.userId;

    // Tìm các lớp mà sinh viên thuộc về
    const classLinks = await ClassStudent.find({ studentId }).select("classId").lean();
    const classIds = classLinks.map((c) => c.classId);

    const schedules = await LearningSchedule.find({ classId: { $in: classIds } })
      .populate("classId")
      .populate("subjectId")
      .lean();

    return res.json({ data: schedules });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/student/slots/upcoming
module.exports.getUpcomingLearningSlots = async (req, res) => {
  try {
    const studentId = req.userId;
    const now = new Date();

    const classLinks = await ClassStudent.find({ studentId }).select("classId").lean();
    const classIds = classLinks.map((c) => c.classId);

    const slots = await ScheduleSlot.find({
      classId: { $in: classIds },
      date: { $gte: now },
    })
      .sort({ date: 1, startTime: 1 })
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

