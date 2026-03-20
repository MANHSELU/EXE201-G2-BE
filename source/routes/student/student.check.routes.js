const express = require("express");
const router = express.Router();
const multer = require("multer");
const authMiddleware = require("../../middleware/auth");
const networkCheck = require("../../middleware/networkCheck");

const {
  getUpcomingLearningSlots,
  getAvailableSlotsForLeave,
} = require("../../controller/student/scheduleController");
const { 
  verifyCode,
  checkinWithFace,
  getMyAttendanceRecords,
  getSlotAttendanceStatus,
} = require("../../controller/student/attendanceController");
const {
  registerFace,
  getFaceStatus,
  getFaceDescriptors,
  verifyFace,
  getLivenessChallenge,
  verifyLiveness,
} = require("../../controller/student/faceController");
const {
  getSemesters,
  getReportBySemester,
} = require("../../controller/student/semesterController");
const {
  requestLeave,
  getMyLeaveRequests,
  getLeaveRequestBySlot,
  cancelLeaveRequest,
} = require("../../controller/student/leaveRequestController");

// Cấu hình multer cho upload ảnh bằng chứng (Cloudinary)
const { proofImageStorage } = require("../../config/cloudinary");
const upload = multer({ storage: proofImageStorage, limits: { fileSize: 5 * 1024 * 1024 } });

// role sinh viên, ví dụ "STUDENT"
const requireStudent = authMiddleware(["STUDENT"]);

router.get("/slots/upcoming", requireStudent, getUpcomingLearningSlots);
router.get("/slots/available-for-leave", requireStudent, getAvailableSlotsForLeave);

// Face Registration APIs
router.post("/face/register", requireStudent, registerFace);
router.get("/face/status", requireStudent, getFaceStatus);
router.get("/face/descriptors", requireStudent, getFaceDescriptors); // Lấy face data từ DB
router.post("/face/verify", requireStudent, verifyFace);
router.get("/face/liveness-challenge", requireStudent, getLivenessChallenge);
router.post("/face/liveness-verify", requireStudent, verifyLiveness);

// Semester APIs
router.get("/semesters", requireStudent, getSemesters);
router.get("/attendance/report-by-semester", requireStudent, getReportBySemester);

// Attendance APIs
router.get("/attendance/my-records", requireStudent, getMyAttendanceRecords);
router.get("/attendance/slot/:slotId", requireStudent, getSlotAttendanceStatus);

// Bước 1: Xác thực mã OTP
router.post("/attendance/verify-code", requireStudent, verifyCode);

// Bước 2: Check-in với face recognition (có networkCheck)
router.post("/attendance/checkin", requireStudent, networkCheck, checkinWithFace);

// Post / Feed APIs
const { getFeed, createPost, deletePost, toggleLike, addComment, toggleCommentLike, getMyPosts } = require("../../controller/post/postController");
const { postImageStorage } = require("../../config/cloudinary");
const postUpload = multer({ storage: postImageStorage, limits: { fileSize: 5 * 1024 * 1024 } });
router.get("/feed", requireStudent, getFeed);
router.get("/feed/my-posts", requireStudent, getMyPosts);
router.post("/feed/posts", requireStudent, postUpload.array("images", 5), createPost);
router.delete("/feed/posts/:id", requireStudent, deletePost);
router.post("/feed/posts/:id/like", requireStudent, toggleLike);
router.post("/feed/posts/:id/comments", requireStudent, postUpload.array("images", 3), addComment);
router.post("/feed/posts/:id/comments/:commentId/like", requireStudent, toggleCommentLike);

// Notification APIs
const { getMyNotifications, getUnreadCount, markAsRead } = require("../../controller/notification/notificationController");
router.get("/notifications", requireStudent, getMyNotifications);
router.get("/notifications/unread-count", requireStudent, getUnreadCount);
router.patch("/notifications/mark-read", requireStudent, markAsRead);

// Leave Request APIs
router.post("/leave-request", requireStudent, upload.single("proofImage"), requestLeave);
router.get("/leave-requests", requireStudent, getMyLeaveRequests);
router.get("/leave-request/:slotId", requireStudent, getLeaveRequestBySlot);
router.delete("/leave-request/:requestId", requireStudent, cancelLeaveRequest);

module.exports = router;
