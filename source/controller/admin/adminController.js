const bcrypt = require("bcryptjs");
const Subject = require("../../model/Subject");
const ClassModel = require("../../model/Class");
const Room = require("../../model/Room");
const User = require("../../model/Users");
const Role = require("../../model/Role");
const ClassStudent = require("../../model/ClassStudent");
const ScheduleSlot = require("../../model/ScheduleSlot");
const TeachingSchedule = require("../../model/TeachingSchedule");
const Semester = require("../../model/Semester");

// ========== SEMESTERS (Kì học) ==========
module.exports.getSemesters = async (req, res) => {
  try {
    const list = await Semester.find({}).sort({ startDate: -1 }).lean();
    return res.json({ data: list });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.createSemester = async (req, res) => {
  try {
    const { name, startDate, endDate } = req.body;
    if (!name || !startDate || !endDate) {
      return res.status(400).json({ message: "Thiếu name, startDate hoặc endDate" });
    }
    const semester = await Semester.create({
      name: name.trim(),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });
    return res.status(201).json({ data: semester });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ========== SUBJECTS ==========
module.exports.getSubjects = async (req, res) => {
  try {
    const list = await Subject.find({}).sort({ code: 1 }).lean();
    return res.json({ data: list });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.createSubject = async (req, res) => {
  try {
    const { code, name, credits } = req.body;
    if (!code || !name || credits == null) {
      return res.status(400).json({ message: "Thiếu code, name hoặc credits" });
    }
    const existing = await Subject.findOne({ code });
    if (existing) return res.status(400).json({ message: "Mã môn học đã tồn tại" });
    const subject = await Subject.create({ code, name, credits: Number(credits) });
    return res.status(201).json({ data: subject });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ========== CLASSES ==========
module.exports.getClasses = async (req, res) => {
  try {
    const list = await ClassModel.find({}).sort({ name: 1 }).lean();
    return res.json({ data: list });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.createClass = async (req, res) => {
  try {
    const { name, courseYear } = req.body;
    if (!name || courseYear == null) {
      return res.status(400).json({ message: "Thiếu name hoặc courseYear" });
    }
    const cls = await ClassModel.create({ name, courseYear: Number(courseYear) });
    return res.status(201).json({ data: cls });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ========== ROOMS ==========
module.exports.getRooms = async (req, res) => {
  try {
    const list = await Room.find({}).sort({ name: 1 }).lean();
    return res.json({ data: list });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.createRoom = async (req, res) => {
  try {
    const { name, capacity } = req.body;
    if (!name || capacity == null) {
      return res.status(400).json({ message: "Thiếu name hoặc capacity" });
    }
    const existing = await Room.findOne({ name });
    if (existing) return res.status(400).json({ message: "Tên phòng đã tồn tại" });
    const room = await Room.create({ name, capacity: Number(capacity) });
    return res.status(201).json({ data: room });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ========== ROLES (for dropdowns) ==========
module.exports.getRoles = async (req, res) => {
  try {
    const list = await Role.find({ isActive: true }).select("name description").sort({ name: 1 }).lean();
    return res.json({ data: list });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ========== USERS: list all (for management) or by role (for dropdowns) ==========
module.exports.getUsersByRole = async (req, res) => {
  try {
    const { role } = req.query; // optional: LECTURER | STUDENT
    if (role && !["LECTURER", "STUDENT", "ADMIN"].includes(role)) {
      return res.status(400).json({ message: "Query role phải là LECTURER, STUDENT hoặc ADMIN" });
    }
    if (role) {
      const roleDoc = await Role.findOne({ name: role });
      if (!roleDoc) return res.json({ data: [] });
      const users = await User.find({ roleId: roleDoc._id })
        .select("fullName email _id")
        .sort({ fullName: 1 })
        .lean();
      return res.json({ data: users });
    }
    // No role = list all users for admin user management
    const users = await User.find({})
      .select("fullName email _id createdAt")
      .populate("roleId", "name")
      .sort({ createdAt: -1 })
      .lean();
    const data = users.map((u) => ({
      _id: u._id,
      fullName: u.fullName,
      email: u.email,
      role: u.roleId?.name || "N/A",
      createdAt: u.createdAt,
    }));
    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ========== CREATE USER (admin only) ==========
module.exports.createUser = async (req, res) => {
  try {
    const { email, password, fullName, role } = req.body;
    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ message: "Thiếu email, password, fullName hoặc role" });
    }
    const roleDoc = await Role.findOne({ name: role });
    if (!roleDoc) return res.status(400).json({ message: "Role không hợp lệ" });
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(400).json({ message: "Email đã tồn tại" });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      fullName: fullName.trim(),
      roleId: roleDoc._id,
    });
    return res.status(201).json({
      data: {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: role,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ========== CLASS STUDENTS ==========
module.exports.getClassStudents = async (req, res) => {
  try {
    const { classId } = req.params;
    const links = await ClassStudent.find({ classId })
      .populate("studentId", "fullName email")
      .lean();
    const students = links.map((l) => ({
      _id: l.studentId._id,
      fullName: l.studentId.fullName,
      email: l.studentId.email,
    }));
    return res.json({ data: students });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.addStudentToClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const { studentId } = req.body;
    if (!studentId) return res.status(400).json({ message: "Thiếu studentId" });
    const exists = await ClassStudent.findOne({ classId, studentId });
    if (exists) return res.status(400).json({ message: "Sinh viên đã ở trong lớp" });
    await ClassStudent.create({ classId, studentId });
    return res.status(201).json({ message: "Đã thêm sinh viên vào lớp" });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.removeStudentFromClass = async (req, res) => {
  try {
    const { classId, studentId } = req.params;
    await ClassStudent.findOneAndDelete({ classId, studentId });
    return res.json({ message: "Đã xóa sinh viên khỏi lớp" });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ========== SCHEDULE SLOTS (Lịch học từng buổi, theo kì) ==========
module.exports.getSlots = async (req, res) => {
  try {
    const { dateFrom, dateTo, semesterId } = req.query;
    const filter = {};
    if (semesterId) filter.semesterId = semesterId;
    if (dateFrom) filter.date = { ...filter.date, $gte: new Date(dateFrom) };
    if (dateTo) filter.date = { ...filter.date, $lte: new Date(dateTo) };
    const slots = await ScheduleSlot.find(filter)
      .sort({ date: 1, startTime: 1 })
      .populate("semesterId", "name startDate endDate")
      .populate("subjectId", "code name")
      .populate("classId", "name")
      .populate("roomId", "name capacity")
      .populate("teacherId", "fullName email")
      .lean();
    return res.json({ data: slots });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.createSlot = async (req, res) => {
  try {
    const { semesterId, subjectId, classId, roomId, teacherId, date, startTime, endTime } = req.body;
    if (!semesterId || !subjectId || !classId || !roomId || !teacherId || !date || !startTime || !endTime) {
      return res.status(400).json({ message: "Thiếu thông tin: semesterId, subjectId, classId, roomId, teacherId, date, startTime, endTime" });
    }
    const slot = await ScheduleSlot.create({
      semesterId,
      subjectId,
      classId,
      roomId,
      teacherId,
      date: new Date(date),
      startTime,
      endTime,
      status: "SCHEDULED",
    });
    const populated = await ScheduleSlot.findById(slot._id)
      .populate("semesterId", "name startDate endDate")
      .populate("subjectId", "code name")
      .populate("classId", "name")
      .populate("roomId", "name")
      .populate("teacherId", "fullName email")
      .lean();
    return res.status(201).json({ data: populated });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.updateSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const { semesterId, subjectId, classId, roomId, teacherId, date, startTime, endTime, status } = req.body;
    const update = {};
    if (semesterId != null) update.semesterId = semesterId;
    if (subjectId != null) update.subjectId = subjectId;
    if (classId != null) update.classId = classId;
    if (roomId != null) update.roomId = roomId;
    if (teacherId != null) update.teacherId = teacherId;
    if (date != null) update.date = new Date(date);
    if (startTime != null) update.startTime = startTime;
    if (endTime != null) update.endTime = endTime;
    if (status != null) update.status = status;
    const slot = await ScheduleSlot.findByIdAndUpdate(id, update, { new: true })
      .populate("semesterId", "name startDate endDate")
      .populate("subjectId", "code name")
      .populate("classId", "name")
      .populate("roomId", "name")
      .populate("teacherId", "fullName email")
      .lean();
    if (!slot) return res.status(404).json({ message: "Không tìm thấy buổi học" });
    return res.json({ data: slot });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.deleteSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const slot = await ScheduleSlot.findByIdAndDelete(id);
    if (!slot) return res.status(404).json({ message: "Không tìm thấy buổi học" });
    return res.json({ message: "Đã xóa buổi học" });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ========== TEACHING SCHEDULES (Lịch dạy theo tuần) ==========
module.exports.getTeachingSchedules = async (req, res) => {
  try {
    const list = await TeachingSchedule.find({})
      .sort({ dayOfWeek: 1, startTime: 1 })
      .populate("teacherId", "fullName email")
      .populate("subjectId", "code name")
      .lean();
    return res.json({ data: list });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.createTeachingSchedule = async (req, res) => {
  try {
    const { teacherId, subjectId, dayOfWeek, startTime, endTime } = req.body;
    if (!teacherId || !subjectId || dayOfWeek == null || !startTime || !endTime) {
      return res.status(400).json({ message: "Thiếu teacherId, subjectId, dayOfWeek, startTime, endTime" });
    }
    const ts = await TeachingSchedule.create({
      teacherId,
      subjectId,
      dayOfWeek: Number(dayOfWeek),
      startTime,
      endTime,
    });
    const populated = await TeachingSchedule.findById(ts._id)
      .populate("teacherId", "fullName email")
      .populate("subjectId", "code name")
      .lean();
    return res.status(201).json({ data: populated });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.deleteTeachingSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const ts = await TeachingSchedule.findByIdAndDelete(id);
    if (!ts) return res.status(404).json({ message: "Không tìm thấy lịch dạy" });
    return res.json({ message: "Đã xóa lịch dạy" });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};
