const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middleware/auth");

const {
  getUsers,
  createUser,
  getRoles,
  getSemesters,
  createSemester,
  getSubjects,
  createSubject,
  getClasses,
  createClass,
  getRooms,
  createRoom,
  getSlots,
  createSlot,
  deleteSlot,
  getTeachingSchedules,
  createTeachingSchedule,
  deleteTeachingSchedule,
  getClassStudents,
  addStudentToClass,
  removeStudentFromClass,
} = require("../../controller/admin/adminController");

const requireAdmin = authMiddleware(["ADMIN"]);

// Users
router.get("/users", requireAdmin, getUsers);
router.post("/users", requireAdmin, createUser);

// Roles
router.get("/roles", requireAdmin, getRoles);

// Semesters
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

// Schedule Slots
router.get("/slots", requireAdmin, getSlots);
router.post("/slots", requireAdmin, createSlot);
router.delete("/slots/:id", requireAdmin, deleteSlot);

// Teaching Schedules
router.get("/teaching-schedules", requireAdmin, getTeachingSchedules);
router.post("/teaching-schedules", requireAdmin, createTeachingSchedule);
router.delete("/teaching-schedules/:id", requireAdmin, deleteTeachingSchedule);

// Class Students
router.get("/classes/:classId/students", requireAdmin, getClassStudents);
router.post("/classes/:classId/students", requireAdmin, addStudentToClass);
router.delete("/classes/:classId/students/:studentId", requireAdmin, removeStudentFromClass);

module.exports = router;
