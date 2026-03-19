const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middleware/auth");
const {
  getUpcomingTeachingSlots,
} = require("../../controller/lectuer/scheduleController");
const {
  createAttendanceSession,
  getRecentAttendanceSessions,
} = require("../../controller/lectuer/attendanceController");
const {
  getLeaveRequestsForLecturer,
  approveLeaveRequest,
  rejectLeaveRequest,
  autoRejectExpiredRequests,
} = require("../../controller/lectuer/leaveRequestController");
const {
  getReportClasses,
  getReportSessions,
  getReportSessionStudents,
} = require("../../controller/lectuer/reportController");

// Các route yêu cầu role giảng viên, ví dụ "LECTURER"
const requireLecturer = authMiddleware(["LECTURER"]);

router.get("/slots/upcoming", requireLecturer, getUpcomingTeachingSlots);
router.post("/attendance/createQrCode", requireLecturer, createAttendanceSession);
router.get("/attendance/recent", requireLecturer, getRecentAttendanceSessions);

// Post / Feed APIs
const multer = require("multer");
const { getFeed, createPost, deletePost, toggleLike, addComment, toggleCommentLike, getMyPosts } = require("../../controller/post/postController");
const postStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/post-images/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + Math.round(Math.random() * 1e9) + "-" + file.originalname),
});
const postUpload = multer({ storage: postStorage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  if (["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only image files are allowed"), false);
}});
router.get("/feed", requireLecturer, getFeed);
router.get("/feed/my-posts", requireLecturer, getMyPosts);
router.post("/feed/posts", requireLecturer, postUpload.array("images", 5), createPost);
router.delete("/feed/posts/:id", requireLecturer, deletePost);
router.post("/feed/posts/:id/like", requireLecturer, toggleLike);
router.post("/feed/posts/:id/comments", requireLecturer, postUpload.array("images", 3), addComment);
router.post("/feed/posts/:id/comments/:commentId/like", requireLecturer, toggleCommentLike);

// Notification APIs
const { getMyNotifications, getUnreadCount, markAsRead } = require("../../controller/notification/notificationController");
router.get("/notifications", requireLecturer, getMyNotifications);
router.get("/notifications/unread-count", requireLecturer, getUnreadCount);
router.patch("/notifications/mark-read", requireLecturer, markAsRead);

// Report APIs
router.get("/reports/classes", requireLecturer, getReportClasses);
router.get("/reports/sessions", requireLecturer, getReportSessions);
router.get("/reports/sessions/:sessionId/students", requireLecturer, getReportSessionStudents);

// Leave Request APIs
router.get("/leave-requests", requireLecturer, getLeaveRequestsForLecturer);
router.patch("/leave-request/:requestId/approve", requireLecturer, approveLeaveRequest);
router.patch("/leave-request/:requestId/reject", requireLecturer, rejectLeaveRequest);
router.post("/leave-requests/auto-reject", autoRejectExpiredRequests);

module.exports = router;


