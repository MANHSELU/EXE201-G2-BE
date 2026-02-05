const express = require("express");
const authMiddleware = require("../../middleware/auth");
const {
  getSemesters,
  createSemester,
  getSubjects,
  createSubject,
  getClasses,
  createClass,
  getRooms,
  createRoom,
  getRoles,
  getUsersByRole,
  createUser,
  getClassStudents,
  addStudentToClass,
  removeStudentFromClass,
  getSlots,
  createSlot,
  updateSlot,
  deleteSlot,
  getTeachingSchedules,
  createTeachingSchedule,
  deleteTeachingSchedule,
} = require("../../controller/admin/adminController");

const router = express.Router();
const requireAdmin = authMiddleware(["ADMIN"]);

// Semesters (Kì học)
router.get("/semesters", requireAdmin, getSemesters);
router.post("/semesters", requireAdmin, createSemester);

// Subjects
router.get("/subjects", requireAdmin, getSubjects);
router.post("/subjects", requireAdmin, createSubject);

// Classes
router.get("/classes", requireAdmin, getClasses);
router.post("/classes", requireAdmin, createClass);

// Rooms
router.get("/rooms", requireAdmin, getRooms);
router.post("/rooms", requireAdmin, createRoom);

// Roles (for create account dropdown)
router.get("/roles", requireAdmin, getRoles);
// Users: GET all (no query) or by role (?role=LECTURER|STUDENT), POST create
router.get("/users", requireAdmin, getUsersByRole);
router.post("/users", requireAdmin, createUser);

// Class students
router.get("/classes/:classId/students", requireAdmin, getClassStudents);
router.post("/classes/:classId/students", requireAdmin, addStudentToClass);
router.delete("/classes/:classId/students/:studentId", requireAdmin, removeStudentFromClass);

// Schedule slots (lịch học từng buổi)
router.get("/slots", requireAdmin, getSlots);
router.post("/slots", requireAdmin, createSlot);
router.put("/slots/:id", requireAdmin, updateSlot);
router.delete("/slots/:id", requireAdmin, deleteSlot);

// Teaching schedules (lịch dạy theo tuần)
router.get("/teaching-schedules", requireAdmin, getTeachingSchedules);
router.post("/teaching-schedules", requireAdmin, createTeachingSchedule);
router.delete("/teaching-schedules/:id", requireAdmin, deleteTeachingSchedule);

module.exports = router;
