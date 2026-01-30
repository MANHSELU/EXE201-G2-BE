const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middleware/auth");
const {
  getUpcomingTeachingSlots,
} = require("../../controller/lectuer/scheduleController");
const {
  createAttendanceSession,
  updateAttendanceCode,
} = require("../../controller/lectuer/attendanceController");

// Các route yêu cầu role giảng viên, ví dụ "LECTURER"
const requireLecturer = authMiddleware(["LECTURER"]);

router.get("/slots/upcoming", requireLecturer, getUpcomingTeachingSlots);
router.post("/attendance/createQrCode", requireLecturer, createAttendanceSession);
module.exports = router;

