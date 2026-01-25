const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middleware/auth");
const networkCheck = require("../../middleware/networkCheck");

const {
  getWeeklyLearningSchedule,
  getUpcomingLearningSlots,
} = require("../../controller/student/scheduleController");
const { checkinWithFace } = require("../../controller/student/attendanceController");

// role sinh viên, ví dụ "STUDENT"
const requireStudent = authMiddleware(["STUDENT"]);

router.get("/schedule/week", requireStudent, getWeeklyLearningSchedule);
router.get("/slots/upcoming", requireStudent, getUpcomingLearningSlots);

// Áp dụng networkCheck cho API điểm danh
router.post("/attendance/checkin", requireStudent, networkCheck, checkinWithFace);

module.exports = router;

