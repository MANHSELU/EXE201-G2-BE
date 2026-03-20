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
const AttendanceSession = require("../../model/AttendanceSession");

// ===================== HELPERS =====================

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

function validateTimeFormat(time) {
  return TIME_REGEX.test(time);
}

function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function timesOverlap(startA, endA, startB, endB) {
  const a0 = timeToMinutes(startA), a1 = timeToMinutes(endA);
  const b0 = timeToMinutes(startB), b1 = timeToMinutes(endB);
  return a0 < b1 && b0 < a1;
}

async function getUserRole(userId) {
  const user = await User.findById(userId).populate("roleId", "name").lean();
  return user?.roleId?.name || null;
}

// ===================== USERS =====================

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
    const user = await User.create({ email, password: hashed, fullName, roleId: roleDoc._id });
    return res.status(201).json({
      data: { _id: user._id, fullName: user.fullName, email: user.email, role: roleDoc.name },
    });
  } catch (err) {
    console.error("[admin/createUser]", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, role } = req.body;
    const update = {};
    if (fullName) update.fullName = fullName;
    if (email) {
      const dup = await User.findOne({ email, _id: { $ne: id } });
      if (dup) return res.status(400).json({ message: "Email đã tồn tại" });
      update.email = email;
    }
    if (role) {
      const roleDoc = await Role.findOne({ name: role.toUpperCase() });
      if (!roleDoc) return res.status(400).json({ message: `Vai trò '${role}' không tồn tại` });
      update.roleId = roleDoc._id;
    }
    const user = await User.findByIdAndUpdate(id, update, { new: true }).populate("roleId", "name");
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });
    return res.json({
      data: { _id: user._id, fullName: user.fullName, email: user.email, role: user.roleId?.name },
    });
  } catch (err) {
    console.error("[admin/updateUser]", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ===================== ROLES =====================

module.exports.getRoles = async (req, res) => {
  try {
    const roles = await Role.find({ isActive: true }).lean();
    return res.json({ data: roles });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ===================== SEMESTERS =====================

module.exports.getSemesters = async (req, res) => {
  try {
    const list = await Semester.find().sort({ startDate: -1 }).lean();
    return res.json({ data: list });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.createSemester = async (req, res) => {
  try {
    const { name, startDate, endDate } = req.body;
    if (!name || !startDate || !endDate) {
      return res.status(400).json({ message: "Thiếu thông tin" });
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: "Ngày không hợp lệ" });
    }
    if (end <= start) {
      return res.status(400).json({ message: "Ngày kết thúc phải sau ngày bắt đầu" });
    }
    // Check unique name
    const dupName = await Semester.findOne({ name: name.trim() });
    if (dupName) {
      return res.status(400).json({ message: "Tên kì học đã tồn tại" });
    }
    // Check overlap
    const overlap = await Semester.findOne({
      $or: [
        { startDate: { $lt: end }, endDate: { $gt: start } },
      ],
    });
    if (overlap) {
      return res.status(400).json({ message: `Thời gian trùng với kì "${overlap.name}"` });
    }
    const semester = await Semester.create({ name: name.trim(), startDate: start, endDate: end });
    return res.status(201).json({ data: semester });
  } catch (err) {
    console.error("[admin/createSemester]", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.updateSemester = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, startDate, endDate } = req.body;
    const existing = await Semester.findById(id);
    if (!existing) return res.status(404).json({ message: "Không tìm thấy kì học" });

    const newName = name ? name.trim() : existing.name;
    const newStart = startDate ? new Date(startDate) : existing.startDate;
    const newEnd = endDate ? new Date(endDate) : existing.endDate;

    if (newEnd <= newStart) {
      return res.status(400).json({ message: "Ngày kết thúc phải sau ngày bắt đầu" });
    }
    if (name) {
      const dupName = await Semester.findOne({ name: newName, _id: { $ne: id } });
      if (dupName) return res.status(400).json({ message: "Tên kì học đã tồn tại" });
    }
    const overlap = await Semester.findOne({
      _id: { $ne: id },
      startDate: { $lt: newEnd },
      endDate: { $gt: newStart },
    });
    if (overlap) {
      return res.status(400).json({ message: `Thời gian trùng với kì "${overlap.name}"` });
    }
    const updated = await Semester.findByIdAndUpdate(id, { name: newName, startDate: newStart, endDate: newEnd }, { new: true });
    return res.json({ data: updated });
  } catch (err) {
    console.error("[admin/updateSemester]", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.deleteSemester = async (req, res) => {
  try {
    const { id } = req.params;
    const slotCount = await ScheduleSlot.countDocuments({ semesterId: id });
    if (slotCount > 0) {
      return res.status(400).json({ message: `Không thể xóa: đang có ${slotCount} buổi học thuộc kì này` });
    }
    await Semester.findByIdAndDelete(id);
    return res.json({ message: "Đã xóa kì học" });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ===================== SUBJECTS =====================

module.exports.getSubjects = async (req, res) => {
  try {
    const list = await Subject.find().sort({ code: 1 }).lean();
    return res.json({ data: list });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.createSubject = async (req, res) => {
  try {
    const { code, name } = req.body;
    if (!code || !name) {
      return res.status(400).json({ message: "Thiếu mã hoặc tên môn" });
    }
    const subject = await Subject.create({ code, name });
    return res.status(201).json({ data: subject });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Mã môn đã tồn tại" });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name } = req.body;
    if (code) {
      const dup = await Subject.findOne({ code, _id: { $ne: id } });
      if (dup) return res.status(400).json({ message: "Mã môn đã tồn tại" });
    }
    const update = {};
    if (code) update.code = code;
    if (name) update.name = name;
    const subject = await Subject.findByIdAndUpdate(id, update, { new: true });
    if (!subject) return res.status(404).json({ message: "Không tìm thấy môn học" });
    return res.json({ data: subject });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const slotCount = await ScheduleSlot.countDocuments({ subjectId: id });
    if (slotCount > 0) {
      return res.status(400).json({ message: `Không thể xóa: đang có ${slotCount} buổi học dùng môn này` });
    }
    const tsCount = await TeachingSchedule.countDocuments({ subjectId: id });
    if (tsCount > 0) {
      return res.status(400).json({ message: `Không thể xóa: đang có ${tsCount} lịch dạy dùng môn này` });
    }
    await Subject.findByIdAndDelete(id);
    return res.json({ message: "Đã xóa môn học" });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ===================== CLASSES =====================

module.exports.getClasses = async (req, res) => {
  try {
    const list = await ClassModel.find().sort({ name: 1 }).lean();
    return res.json({ data: list });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.createClass = async (req, res) => {
  try {
    const { name, courseYear } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Thiếu tên lớp" });
    }
    const year = courseYear || new Date().getFullYear();
    // Check unique name + courseYear
    const dup = await ClassModel.findOne({ name: name.trim(), courseYear: year });
    if (dup) {
      return res.status(400).json({ message: `Lớp "${name}" năm ${year} đã tồn tại` });
    }
    const cls = await ClassModel.create({ name: name.trim(), courseYear: year });
    return res.status(201).json({ data: cls });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, courseYear } = req.body;
    const existing = await ClassModel.findById(id);
    if (!existing) return res.status(404).json({ message: "Không tìm thấy lớp" });
    const newName = name ? name.trim() : existing.name;
    const newYear = courseYear || existing.courseYear;
    const dup = await ClassModel.findOne({ name: newName, courseYear: newYear, _id: { $ne: id } });
    if (dup) return res.status(400).json({ message: `Lớp "${newName}" năm ${newYear} đã tồn tại` });
    const updated = await ClassModel.findByIdAndUpdate(id, { name: newName, courseYear: newYear }, { new: true });
    return res.json({ data: updated });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.deleteClass = async (req, res) => {
  try {
    const { id } = req.params;
    const slotCount = await ScheduleSlot.countDocuments({ classId: id });
    if (slotCount > 0) {
      return res.status(400).json({ message: `Không thể xóa: đang có ${slotCount} buổi học thuộc lớp này` });
    }
    const studentCount = await ClassStudent.countDocuments({ classId: id });
    if (studentCount > 0) {
      return res.status(400).json({ message: `Không thể xóa: đang có ${studentCount} sinh viên trong lớp` });
    }
    await ClassModel.findByIdAndDelete(id);
    return res.json({ message: "Đã xóa lớp" });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ===================== ROOMS =====================

module.exports.getRooms = async (req, res) => {
  try {
    const list = await Room.find().sort({ name: 1 }).lean();
    return res.json({ data: list });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

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

module.exports.updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, capacity } = req.body;
    if (name) {
      const dup = await Room.findOne({ name, _id: { $ne: id } });
      if (dup) return res.status(400).json({ message: "Tên phòng đã tồn tại" });
    }
    const update = {};
    if (name) update.name = name;
    if (capacity !== undefined) update.capacity = capacity;
    const room = await Room.findByIdAndUpdate(id, update, { new: true });
    if (!room) return res.status(404).json({ message: "Không tìm thấy phòng" });
    return res.json({ data: room });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const slotCount = await ScheduleSlot.countDocuments({ roomId: id });
    if (slotCount > 0) {
      return res.status(400).json({ message: `Không thể xóa: đang có ${slotCount} buổi học dùng phòng này` });
    }
    await Room.findByIdAndDelete(id);
    return res.json({ message: "Đã xóa phòng" });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ===================== SCHEDULE SLOTS =====================

module.exports.getSlots = async (req, res) => {
  try {
    const { semesterId, showPast } = req.query;
    const query = semesterId ? { semesterId } : {};
    // Mặc định chỉ lấy từ hôm nay trở đi, trừ khi showPast=true
    if (showPast !== "true") {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      query.date = { $gte: today };
    }
    const list = await ScheduleSlot.find(query)
      .populate("semesterId", "name")
      .populate("subjectId", "code name")
      .populate("classId", "name")
      .populate("roomId", "name")
      .populate("teacherId", "fullName email")
      .sort({ date: 1, startTime: 1 })
      .lean();
    return res.json({ data: list });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.createSlot = async (req, res) => {
  try {
    const { semesterId, subjectId, classId, roomId, teacherId, date, startTime, endTime } = req.body;
    if (!subjectId || !classId || !roomId || !teacherId || !date) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
    }

    const st = startTime || "07:30";
    const et = endTime || "09:30";

    // Validate time format
    if (!validateTimeFormat(st) || !validateTimeFormat(et)) {
      return res.status(400).json({ message: "Định dạng thời gian không hợp lệ (HH:MM)" });
    }
    if (timeToMinutes(et) <= timeToMinutes(st)) {
      return res.status(400).json({ message: "Giờ kết thúc phải sau giờ bắt đầu" });
    }

    // Verify references exist
    const [subjectExists, classExists, roomExists] = await Promise.all([
      Subject.findById(subjectId), ClassModel.findById(classId), Room.findById(roomId),
    ]);
    if (!subjectExists) return res.status(400).json({ message: "Môn học không tồn tại" });
    if (!classExists) return res.status(400).json({ message: "Lớp học không tồn tại" });
    if (!roomExists) return res.status(400).json({ message: "Phòng học không tồn tại" });

    // Verify teacherId is LECTURER
    const teacherRole = await getUserRole(teacherId);
    if (teacherRole !== "LECTURER") {
      return res.status(400).json({ message: "Người được chọn không phải giảng viên" });
    }

    // Validate date within semester
    const slotDate = new Date(date);
    if (semesterId) {
      const semester = await Semester.findById(semesterId);
      if (!semester) return res.status(400).json({ message: "Kì học không tồn tại" });
      const semStart = new Date(semester.startDate); semStart.setHours(0, 0, 0, 0);
      const semEnd = new Date(semester.endDate); semEnd.setHours(23, 59, 59, 999);
      if (slotDate < semStart || slotDate > semEnd) {
        return res.status(400).json({ message: `Ngày học phải nằm trong kỳ (${semStart.toLocaleDateString("vi-VN")} - ${semEnd.toLocaleDateString("vi-VN")})` });
      }
    }

    // Build date range for conflict check (same calendar day)
    const dayStart = new Date(slotDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(slotDate); dayEnd.setHours(23, 59, 59, 999);

    const sameDaySlots = await ScheduleSlot.find({
      date: { $gte: dayStart, $lte: dayEnd },
      status: { $ne: "CANCELLED" },
    }).lean();

    // Check teacher conflict
    const teacherConflict = sameDaySlots.find(
      (s) => s.teacherId.toString() === teacherId && timesOverlap(st, et, s.startTime, s.endTime)
    );
    if (teacherConflict) {
      return res.status(400).json({
        message: `Giảng viên đã có lịch dạy trùng giờ (${teacherConflict.startTime}-${teacherConflict.endTime})`,
      });
    }

    // Check duplicate: same class, same date, overlapping time
    const duplicateSlot = sameDaySlots.find(
      (s) => s.classId.toString() === classId && timesOverlap(st, et, s.startTime, s.endTime)
    );
    if (duplicateSlot) {
      return res.status(400).json({
        message: `Lớp này đã có buổi học trùng giờ trong ngày (${duplicateSlot.startTime}-${duplicateSlot.endTime})`,
      });
    }

    // Check room conflict
    const roomConflict = sameDaySlots.find(
      (s) => s.roomId.toString() === roomId && timesOverlap(st, et, s.startTime, s.endTime)
    );
    if (roomConflict) {
      return res.status(400).json({
        message: `Phòng đã được sử dụng trùng giờ (${roomConflict.startTime}-${roomConflict.endTime})`,
      });
    }

    // Check student conflict: find students in classId, check if they have another slot at same time
    const classStudentIds = (await ClassStudent.find({ classId }).lean()).map((cs) => cs.studentId.toString());
    if (classStudentIds.length > 0) {
      // Find other classes that have overlapping slots at same time
      const conflictingSlots = sameDaySlots.filter(
        (s) => s.classId.toString() !== classId && timesOverlap(st, et, s.startTime, s.endTime)
      );
      for (const cs of conflictingSlots) {
        const otherClassStudents = (await ClassStudent.find({ classId: cs.classId }).lean()).map((x) => x.studentId.toString());
        const overlap = classStudentIds.filter((sid) => otherClassStudents.includes(sid));
        if (overlap.length > 0) {
          const conflictClass = await ClassModel.findById(cs.classId).lean();
          return res.status(400).json({
            message: `${overlap.length} sinh viên bị trùng lịch với lớp "${conflictClass?.name}" (${cs.startTime}-${cs.endTime})`,
          });
        }
      }
    }

    const slot = await ScheduleSlot.create({
      semesterId: semesterId || undefined,
      subjectId, classId, roomId, teacherId,
      date: slotDate, startTime: st, endTime: et,
    });
    return res.status(201).json({ data: slot });
  } catch (err) {
    console.error("[admin/createSlot]", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.updateSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const { subjectId, classId, roomId, teacherId, date, startTime, endTime, status } = req.body;

    const existing = await ScheduleSlot.findById(id);
    if (!existing) return res.status(404).json({ message: "Không tìm thấy buổi học" });

    const st = startTime || existing.startTime;
    const et = endTime || existing.endTime;
    const tid = teacherId || existing.teacherId.toString();
    const rid = roomId || existing.roomId.toString();
    const cid = classId || existing.classId.toString();
    const slotDate = date ? new Date(date) : existing.date;

    if (!validateTimeFormat(st) || !validateTimeFormat(et)) {
      return res.status(400).json({ message: "Định dạng thời gian không hợp lệ (HH:MM)" });
    }
    if (timeToMinutes(et) <= timeToMinutes(st)) {
      return res.status(400).json({ message: "Giờ kết thúc phải sau giờ bắt đầu" });
    }

    if (teacherId) {
      const teacherRole = await getUserRole(teacherId);
      if (teacherRole !== "LECTURER") {
        return res.status(400).json({ message: "Người được chọn không phải giảng viên" });
      }
    }

    // Conflict checks (exclude self)
    const dayStart = new Date(slotDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(slotDate); dayEnd.setHours(23, 59, 59, 999);
    const sameDaySlots = await ScheduleSlot.find({
      _id: { $ne: id },
      date: { $gte: dayStart, $lte: dayEnd },
      status: { $ne: "CANCELLED" },
    }).lean();

    const teacherConflict = sameDaySlots.find(
      (s) => s.teacherId.toString() === tid && timesOverlap(st, et, s.startTime, s.endTime)
    );
    if (teacherConflict) {
      return res.status(400).json({ message: `Giảng viên đã có lịch dạy trùng giờ (${teacherConflict.startTime}-${teacherConflict.endTime})` });
    }

    const roomConflict = sameDaySlots.find(
      (s) => s.roomId.toString() === rid && timesOverlap(st, et, s.startTime, s.endTime)
    );
    if (roomConflict) {
      return res.status(400).json({ message: `Phòng đã được sử dụng trùng giờ (${roomConflict.startTime}-${roomConflict.endTime})` });
    }

    const update = {};
    if (subjectId) update.subjectId = subjectId;
    if (classId) update.classId = classId;
    if (roomId) update.roomId = roomId;
    if (teacherId) update.teacherId = teacherId;
    if (date) update.date = slotDate;
    if (startTime) update.startTime = st;
    if (endTime) update.endTime = et;
    if (status) update.status = status;

    const updated = await ScheduleSlot.findByIdAndUpdate(id, update, { new: true })
      .populate("semesterId", "name")
      .populate("subjectId", "code name")
      .populate("classId", "name")
      .populate("roomId", "name")
      .populate("teacherId", "fullName email");
    return res.json({ data: updated });
  } catch (err) {
    console.error("[admin/updateSlot]", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.deleteSlot = async (req, res) => {
  try {
    const { id } = req.params;
    // Check if attendance session exists
    const sessionCount = await AttendanceSession.countDocuments({ slotId: id });
    if (sessionCount > 0) {
      return res.status(400).json({ message: "Không thể xóa: buổi học đã có phiên điểm danh" });
    }
    await ScheduleSlot.findByIdAndDelete(id);
    return res.json({ message: "Đã xóa" });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ===================== TEACHING SCHEDULES =====================

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

module.exports.createTeachingSchedule = async (req, res) => {
  try {
    const { teacherId, subjectId, dayOfWeek, startTime, endTime } = req.body;
    if (!teacherId || !subjectId || !dayOfWeek) {
      return res.status(400).json({ message: "Thiếu thông tin" });
    }

    const st = startTime || "07:30";
    const et = endTime || "09:30";

    if (!validateTimeFormat(st) || !validateTimeFormat(et)) {
      return res.status(400).json({ message: "Định dạng thời gian không hợp lệ (HH:MM)" });
    }
    if (timeToMinutes(et) <= timeToMinutes(st)) {
      return res.status(400).json({ message: "Giờ kết thúc phải sau giờ bắt đầu" });
    }

    // Verify role
    const teacherRole = await getUserRole(teacherId);
    if (teacherRole !== "LECTURER") {
      return res.status(400).json({ message: "Người được chọn không phải giảng viên" });
    }

    // Check teacher conflict on same day
    const conflict = await TeachingSchedule.findOne({
      teacherId,
      dayOfWeek,
    }).lean();

    if (conflict && timesOverlap(st, et, conflict.startTime, conflict.endTime)) {
      return res.status(400).json({
        message: `Giảng viên đã có lịch dạy trùng vào thứ ${dayOfWeek} (${conflict.startTime}-${conflict.endTime})`,
      });
    }

    // Check all schedules of this teacher on this day (there might be multiple)
    const allConflicts = await TeachingSchedule.find({ teacherId, dayOfWeek }).lean();
    for (const c of allConflicts) {
      if (timesOverlap(st, et, c.startTime, c.endTime)) {
        return res.status(400).json({
          message: `Giảng viên đã có lịch dạy trùng vào thứ ${dayOfWeek} (${c.startTime}-${c.endTime})`,
        });
      }
    }

    const ts = await TeachingSchedule.create({
      teacherId, subjectId, dayOfWeek,
      startTime: st, endTime: et,
    });
    return res.status(201).json({ data: ts });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.updateTeachingSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherId, subjectId, dayOfWeek, startTime, endTime } = req.body;
    const existing = await TeachingSchedule.findById(id);
    if (!existing) return res.status(404).json({ message: "Không tìm thấy lịch dạy" });

    const st = startTime || existing.startTime;
    const et = endTime || existing.endTime;
    const tid = teacherId || existing.teacherId.toString();
    const dow = dayOfWeek || existing.dayOfWeek;

    if (!validateTimeFormat(st) || !validateTimeFormat(et)) {
      return res.status(400).json({ message: "Định dạng thời gian không hợp lệ (HH:MM)" });
    }
    if (timeToMinutes(et) <= timeToMinutes(st)) {
      return res.status(400).json({ message: "Giờ kết thúc phải sau giờ bắt đầu" });
    }

    if (teacherId) {
      const teacherRole = await getUserRole(teacherId);
      if (teacherRole !== "LECTURER") {
        return res.status(400).json({ message: "Người được chọn không phải giảng viên" });
      }
    }

    // Check conflict (exclude self)
    const conflicts = await TeachingSchedule.find({ _id: { $ne: id }, teacherId: tid, dayOfWeek: dow }).lean();
    for (const c of conflicts) {
      if (timesOverlap(st, et, c.startTime, c.endTime)) {
        return res.status(400).json({
          message: `Giảng viên đã có lịch dạy trùng vào thứ ${dow} (${c.startTime}-${c.endTime})`,
        });
      }
    }

    const update = {};
    if (teacherId) update.teacherId = teacherId;
    if (subjectId) update.subjectId = subjectId;
    if (dayOfWeek) update.dayOfWeek = dayOfWeek;
    if (startTime) update.startTime = st;
    if (endTime) update.endTime = et;

    const updated = await TeachingSchedule.findByIdAndUpdate(id, update, { new: true })
      .populate("teacherId", "fullName email")
      .populate("subjectId", "code name");
    return res.json({ data: updated });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.deleteTeachingSchedule = async (req, res) => {
  try {
    await TeachingSchedule.findByIdAndDelete(req.params.id);
    return res.json({ message: "Đã xóa" });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ===================== GENERATE SLOTS FOR SEMESTER =====================

module.exports.generateSlotsFromSchedule = async (req, res) => {
  try {
    const { semesterId, teachingScheduleId, classId, roomId } = req.body;
    if (!semesterId || !teachingScheduleId || !classId || !roomId) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
    }

    const semester = await Semester.findById(semesterId);
    if (!semester) return res.status(404).json({ message: "Không tìm thấy kì học" });

    const ts = await TeachingSchedule.findById(teachingScheduleId);
    if (!ts) return res.status(404).json({ message: "Không tìm thấy lịch dạy" });

    const start = new Date(semester.startDate);
    const end = new Date(semester.endDate);

    // dayOfWeek in model: 1=CN, 2=T2, ... 7=T7
    // JS getDay(): 0=CN, 1=T2, ... 6=T7
    const jsDayMap = [null, 0, 1, 2, 3, 4, 5, 6]; // index = dayOfWeek value
    const targetJsDay = jsDayMap[ts.dayOfWeek];
    if (targetJsDay === null || targetJsDay === undefined) {
      return res.status(400).json({ message: "Ngày trong tuần không hợp lệ" });
    }

    // Find first occurrence
    const current = new Date(start);
    while (current.getDay() !== targetJsDay) {
      current.setDate(current.getDate() + 1);
    }

    const created = [];
    const skipped = [];

    while (current <= end) {
      const slotDate = new Date(current);
      const dayStart = new Date(slotDate); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(slotDate); dayEnd.setHours(23, 59, 59, 999);

      const sameDaySlots = await ScheduleSlot.find({
        date: { $gte: dayStart, $lte: dayEnd },
        status: { $ne: "CANCELLED" },
      }).lean();

      // Check teacher conflict
      const teacherConflict = sameDaySlots.find(
        (s) => s.teacherId.toString() === ts.teacherId.toString() && timesOverlap(ts.startTime, ts.endTime, s.startTime, s.endTime)
      );
      // Check room conflict
      const roomConflict = sameDaySlots.find(
        (s) => s.roomId.toString() === roomId && timesOverlap(ts.startTime, ts.endTime, s.startTime, s.endTime)
      );

      // Check student conflict
      let studentConflict = false;
      if (!teacherConflict && !roomConflict) {
        const classStudentIds = (await ClassStudent.find({ classId }).lean()).map((cs) => cs.studentId.toString());
        if (classStudentIds.length > 0) {
          const conflictingSlots = sameDaySlots.filter(
            (s) => s.classId.toString() !== classId && timesOverlap(ts.startTime, ts.endTime, s.startTime, s.endTime)
          );
          for (const cs of conflictingSlots) {
            const otherStudents = (await ClassStudent.find({ classId: cs.classId }).lean()).map((x) => x.studentId.toString());
            if (classStudentIds.some((sid) => otherStudents.includes(sid))) {
              studentConflict = true;
              break;
            }
          }
        }
      }

      if (teacherConflict || roomConflict || studentConflict) {
        skipped.push({
          date: slotDate.toISOString().split("T")[0],
          reason: teacherConflict ? "Trùng lịch giảng viên" : roomConflict ? "Trùng phòng" : "Trùng lịch sinh viên",
        });
      } else {
        const slot = await ScheduleSlot.create({
          semesterId,
          subjectId: ts.subjectId,
          classId,
          roomId,
          teacherId: ts.teacherId,
          date: slotDate,
          startTime: ts.startTime,
          endTime: ts.endTime,
        });
        created.push(slot);
      }

      current.setDate(current.getDate() + 7);
    }

    return res.status(201).json({
      message: `Đã tạo ${created.length} buổi học${skipped.length > 0 ? `, bỏ qua ${skipped.length} buổi bị trùng` : ""}`,
      data: { created: created.length, skipped },
    });
  } catch (err) {
    console.error("[admin/generateSlots]", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ===================== CLASS-STUDENTS =====================

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

module.exports.addStudentToClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const { studentId } = req.body;
    if (!studentId) {
      return res.status(400).json({ message: "Thiếu studentId" });
    }

    // Verify student role
    const studentRole = await getUserRole(studentId);
    if (studentRole !== "STUDENT") {
      return res.status(400).json({ message: "Người được chọn không phải sinh viên" });
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

module.exports.removeStudentFromClass = async (req, res) => {
  try {
    const { classId, studentId } = req.params;
    await ClassStudent.findOneAndDelete({ classId, studentId });
    return res.json({ message: "Đã xóa sinh viên khỏi lớp" });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};
