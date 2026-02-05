const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middleware/auth");
const networkCheck = require("../../middleware/networkCheck");

const {
  getUpcomingLearningSlots,
  getSemesters,
} = require("../../controller/student/scheduleController");
const { 
  verifyCode,
  checkinWithFace,
  getMyAttendanceRecords,
  getSlotAttendanceStatus,
  getReportBySemester,
} = require("../../controller/student/attendanceController");
const {
  registerFace,
  getFaceStatus,
  getFaceDescriptors,
  verifyFace,
  detectFaceImage,
  verifyFaceImage,
  faceServiceHealth,
} = require("../../controller/student/faceController");

// role sinh viên, ví dụ "STUDENT"
const requireStudent = authMiddleware(["STUDENT"]);

router.get("/slots/upcoming", requireStudent, getUpcomingLearningSlots);
router.get("/semesters", requireStudent, getSemesters);

// Face Registration APIs
router.post("/face/register", requireStudent, registerFace);
router.get("/face/status", requireStudent, getFaceStatus);
router.get("/face/descriptors", requireStudent, getFaceDescriptors); // Lấy face data từ DB
router.post("/face/verify", requireStudent, verifyFace);
// Proxy qua BE để so sánh với dữ liệu trên máy chủ (face-service)
router.get("/face/health", requireStudent, faceServiceHealth);
router.post("/face/detect", requireStudent, detectFaceImage);
router.post("/face/verify-image", requireStudent, verifyFaceImage);

// Attendance APIs
router.get("/attendance/my-records", requireStudent, getMyAttendanceRecords);
router.get("/attendance/report-by-semester", requireStudent, getReportBySemester);
router.get("/attendance/slot/:slotId", requireStudent, getSlotAttendanceStatus);

// Bước 1: Xác thực mã OTP
router.post("/attendance/verify-code", requireStudent, verifyCode);

// Bước 2: Check-in với face recognition (có networkCheck)
router.post("/attendance/checkin", requireStudent, networkCheck, checkinWithFace);

module.exports = router;

