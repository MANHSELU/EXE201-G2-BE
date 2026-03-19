const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middleware/auth");

const {
  adminGetPosts, approvePost, rejectPost, adminDeletePost,
} = require("../../controller/post/postController");

const {
  getUsers,
  createUser,
  updateUser,
  getRoles,
  getSemesters,
  createSemester,
  updateSemester,
  deleteSemester,
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  getClasses,
  createClass,
  updateClass,
  deleteClass,
  getRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  getSlots,
  createSlot,
  updateSlot,
  deleteSlot,
  getTeachingSchedules,
  createTeachingSchedule,
  updateTeachingSchedule,
  deleteTeachingSchedule,
  generateSlotsFromSchedule,
  getClassStudents,
  addStudentToClass,
  removeStudentFromClass,
} = require("../../controller/admin/adminController");

const requireAdmin = authMiddleware(["ADMIN"]);

// Users
router.get("/users", requireAdmin, getUsers);
router.post("/users", requireAdmin, createUser);
router.put("/users/:id", requireAdmin, updateUser);

// Roles
router.get("/roles", requireAdmin, getRoles);

// Semesters
router.get("/semesters", requireAdmin, getSemesters);
router.post("/semesters", requireAdmin, createSemester);
router.put("/semesters/:id", requireAdmin, updateSemester);
router.delete("/semesters/:id", requireAdmin, deleteSemester);

// Subjects
router.get("/subjects", requireAdmin, getSubjects);
router.post("/subjects", requireAdmin, createSubject);
router.put("/subjects/:id", requireAdmin, updateSubject);
router.delete("/subjects/:id", requireAdmin, deleteSubject);

// Classes
router.get("/classes", requireAdmin, getClasses);
router.post("/classes", requireAdmin, createClass);
router.put("/classes/:id", requireAdmin, updateClass);
router.delete("/classes/:id", requireAdmin, deleteClass);

// Rooms
router.get("/rooms", requireAdmin, getRooms);
router.post("/rooms", requireAdmin, createRoom);
router.put("/rooms/:id", requireAdmin, updateRoom);
router.delete("/rooms/:id", requireAdmin, deleteRoom);

// Schedule Slots
router.get("/slots", requireAdmin, getSlots);
router.post("/slots/generate", requireAdmin, generateSlotsFromSchedule);
router.post("/slots", requireAdmin, createSlot);
router.put("/slots/:id", requireAdmin, updateSlot);
router.delete("/slots/:id", requireAdmin, deleteSlot);

// Teaching Schedules
router.get("/teaching-schedules", requireAdmin, getTeachingSchedules);
router.post("/teaching-schedules", requireAdmin, createTeachingSchedule);
router.put("/teaching-schedules/:id", requireAdmin, updateTeachingSchedule);
router.delete("/teaching-schedules/:id", requireAdmin, deleteTeachingSchedule);

// Class Students
router.get("/classes/:classId/students", requireAdmin, getClassStudents);
router.post("/classes/:classId/students", requireAdmin, addStudentToClass);
router.delete("/classes/:classId/students/:studentId", requireAdmin, removeStudentFromClass);

// Posts moderation
router.get("/posts", requireAdmin, adminGetPosts);
router.patch("/posts/:id/approve", requireAdmin, approvePost);
router.patch("/posts/:id/reject", requireAdmin, rejectPost);
router.delete("/posts/:id", requireAdmin, adminDeletePost);

module.exports = router;
