const bcrypt = require("bcryptjs");
const User = require("../../model/Users");
const Role = require("../../model/Role");
const Subject = require("../../model/Subject");
const ClassModel = require("../../model/Class");
const Room = require("../../model/Room");
const ScheduleSlot = require("../../model/ScheduleSlot");
const Semester = require("../../model/Semester");
const TeachingSchedule = require("../../model/TeachingSchedule");
const ClassStudent = require("../../model/ClassStudent");

// ===================== USERS =====================

// GET /api/admin/users  (optional query: ?role=STUDENT)
module.exports.getUsers = async (req, res) => {
  try {
    const { role } = req.query;
    let query = {};

    if (role) {
      const roleDoc = await Role.findOne({ name: role.toUpperCase() });
      if (roleDoc) query.roleId = roleDoc._id;
    }

    const users = await User.find(query)
      .populate("roleId", "name")
      .sort({ createdAt: -1 })
      .lean();

    const data = users.map((u) => ({
      _id: u._id,
      fullName: u.fullName,
      email: u.email,
      role: u.roleId?.name || "UNKNOWN",
      createdAt: u.createdAt,
    }));

    return res.json({ data });
  } catch (err) {
    console.error("[admin/getUsers]", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/admin/users
module.exports.createUser = async (req, res) => {
  try {
    const { email, password, fullName, role } = req.body;
    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email đã tồn tại" });
    }

    const roleDoc = await Role.findOne({ name: role.toUpperCase() });
    if (!roleDoc) {
      return res.status(400).json({ message: `Vai trò '${role}' không tồn tại` });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      password: hashed,
      fullName,
      roleId: roleDoc._id,
    });

    return res.status(201).json({
      data: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: roleDoc.name,
      },
    });
  } catch (err) {
    console.error("[admin/createUser]", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ===================== ROLES =====================

// GET /api/admin/roles
module.exports.getRoles = async (req, res) => {
  try {
    const roles = await Role.find({ isActive: true }).lean();
    return res.json({ data: roles });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ===================== SEMESTERS =====================

// GET /api/admin/semesters
module.exports.getSemesters = async (req, res) => {
  try {
    const list = await Semester.find().sort({ startDate: -1 }).lean();
    return res.json({ data: list });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/admin/semesters
module.exports.createSemester = async (req, res) => {
  try {
    const { name, startDate, endDate } = req.body;
    if (!name || !startDate || !endDate) {
      return res.status(400).json({ message: "Thiếu thông tin" });
    }
    const semester = await Semester.create({ name, startDate, endDate });
    return res.status(201).json({ data: semester });
  } catch (err) {
    console.error("[admin/createSemester]", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ===================== SUBJECTS =====================

// GET /api/admin/subjects
module.exports.getSubjects = async (req, res) => {
  try {
    const list = await Subject.find().sort({ code: 1 }).lean();
    return res.json({ data: list });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/admin/subjects
module.exports.createSubject = async (req, res) => {
  try {
    const { code, name, credits } = req.body;
    if (!code || !name) {
      return res.status(400).json({ message: "Thiếu mã hoặc tên môn" });
    }
    const subject = await Subject.create({ code, name, credits: credits || 3 });
    return res.status(201).json({ data: subject });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Mã môn đã tồn tại" });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ===================== CLASSES =====================

// GET /api/admin/classes
module.exports.getClasses = async (req, res) => {
  try {
    const list = await ClassModel.find().sort({ name: 1 }).lean();
    return res.json({ data: list });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/admin/classes
module.exports.createClass = async (req, res) => {
  try {
    const { name, courseYear } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Thiếu tên lớp" });
    }
    const cls = await ClassModel.create({ name, courseYear: courseYear || new Date().getFullYear() });
    return res.status(201).json({ data: cls });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ===================== ROOMS =====================

// GET /api/admin/rooms
module.exports.getRooms = async (req, res) => {
  try {
    const list = await Room.find().sort({ name: 1 }).lean();
    return res.json({ data: list });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/admin/rooms
module.exports.createRoom = async (req, res) => {
  try {
    const { name, capacity } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Thiếu tên phòng" });
    }
    const room = await Room.create({ name, capacity: capacity || 40 });
    return res.status(201).json({ data: room });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Phòng đã tồn tại" });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ===================== SCHEDULE SLOTS =====================

// GET /api/admin/slots  (optional ?semesterId=xxx)
module.exports.getSlots = async (req, res) => {
  try {
    const { semesterId } = req.query;
    const query = semesterId ? { semesterId } : {};

    const list = await ScheduleSlot.find(query)
      .populate("semesterId", "name")
      .populate("subjectId", "code name")
      .populate("classId", "name")
      .populate("roomId", "name")
      .populate("teacherId", "fullName email")
      .sort({ date: -1, startTime: 1 })
      .lean();

    return res.json({ data: list });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/admin/slots
module.exports.createSlot = async (req, res) => {
  try {
    const { semesterId, subjectId, classId, roomId, teacherId, date, startTime, endTime } = req.body;
    if (!subjectId || !classId || !roomId || !teacherId || !date) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
    }
    const slot = await ScheduleSlot.create({
      semesterId: semesterId || undefined,
      subjectId,
      classId,
      roomId,
      teacherId,
      date,
      startTime: startTime || "07:30",
      endTime: endTime || "09:30",
    });
    return res.status(201).json({ data: slot });
  } catch (err) {
    console.error("[admin/createSlot]", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// DELETE /api/admin/slots/:id
module.exports.deleteSlot = async (req, res) => {
  try {
    await ScheduleSlot.findByIdAndDelete(req.params.id);
    return res.json({ message: "Đã xóa" });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ===================== TEACHING SCHEDULES =====================

// GET /api/admin/teaching-schedules
module.exports.getTeachingSchedules = async (req, res) => {
  try {
    const list = await TeachingSchedule.find()
      .populate("teacherId", "fullName email")
      .populate("subjectId", "code name")
      .sort({ dayOfWeek: 1, startTime: 1 })
      .lean();
    return res.json({ data: list });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/admin/teaching-schedules
module.exports.createTeachingSchedule = async (req, res) => {
  try {
    const { teacherId, subjectId, dayOfWeek, startTime, endTime } = req.body;
    if (!teacherId || !subjectId || !dayOfWeek) {
      return res.status(400).json({ message: "Thiếu thông tin" });
    }
    const ts = await TeachingSchedule.create({
      teacherId,
      subjectId,
      dayOfWeek,
      startTime: startTime || "07:30",
      endTime: endTime || "09:30",
    });
    return res.status(201).json({ data: ts });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// DELETE /api/admin/teaching-schedules/:id
module.exports.deleteTeachingSchedule = async (req, res) => {
  try {
    await TeachingSchedule.findByIdAndDelete(req.params.id);
    return res.json({ message: "Đã xóa" });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ===================== CLASS-STUDENTS =====================

// GET /api/admin/classes/:classId/students
module.exports.getClassStudents = async (req, res) => {
  try {
    const { classId } = req.params;
    const links = await ClassStudent.find({ classId })
      .populate("studentId", "fullName email")
      .lean();
    const data = links.map((l) => ({
      _id: l.studentId?._id,
      fullName: l.studentId?.fullName,
      email: l.studentId?.email,
    }));
    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/admin/classes/:classId/students
module.exports.addStudentToClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const { studentId } = req.body;
    if (!studentId) {
      return res.status(400).json({ message: "Thiếu studentId" });
    }
    await ClassStudent.create({ classId, studentId });
    return res.status(201).json({ message: "Đã thêm sinh viên vào lớp" });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Sinh viên đã có trong lớp" });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

// DELETE /api/admin/classes/:classId/students/:studentId
module.exports.removeStudentFromClass = async (req, res) => {
  try {
    const { classId, studentId } = req.params;
    await ClassStudent.findOneAndDelete({ classId, studentId });
    return res.json({ message: "Đã xóa sinh viên khỏi lớp" });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};
