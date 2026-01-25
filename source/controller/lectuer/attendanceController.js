const crypto = require("crypto");
const AttendanceSession = require("../../model/AttendanceSession");
const ScheduleSlot = require("../../model/ScheduleSlot");

const ALPHANUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const generateRandomCode = (length) => {
  const bytes = crypto.randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += ALPHANUM[bytes[i] % ALPHANUM.length];
  }
  return result;
};

const hashCode = (code) => {
  return crypto.createHash("sha256").update(code).digest("hex");
};

// POST /api/lecturer/attendance/session
// Tạo mới phiên điểm danh (random code 6 ký tự, tự động +2 phút)
// body: { slotId }
module.exports.createAttendanceSession = async (req, res) => {
  try {
    const { slotId } = req.body;
    const teacherId = req.userId;

    if (!slotId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const slot = await ScheduleSlot.findById(slotId);
    if (!slot) {
      return res.status(404).json({ message: "Slot not found" });
    }

    if (String(slot.teacherId) !== String(teacherId)) {
      return res.status(403).json({ message: "Bạn không có quyền tạo phiên cho slot này" });
    }

    const rawCode = generateRandomCode(6);
    const now = new Date();
    const expireTime = new Date(now.getTime() + 2 * 60 * 1000); // +2 phút

    const existingSession = await AttendanceSession.findOne({ slotId, teacherId });
    
    let session;
    if (existingSession) {
      // Update mã mới nếu đã tồn tại
      existingSession.codeHash = hashCode(rawCode);
      existingSession.startTime = now;
      existingSession.endTime = expireTime;
      session = await existingSession.save();
    } else {
      // Tạo mới nếu chưa có
      session = await AttendanceSession.create({
        slotId,
        teacherId,
        codeHash: hashCode(rawCode),
        startTime: now,
        endTime: expireTime,
      });
    }

    return res.status(201).json({
      data: {
        attendanceSessionId: session._id,
        slotId,
        code: rawCode,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// PATCH /api/lecturer/attendance/session/code
// Cập nhật mã QR (chỉ đổi mã)
// body: { attendanceSessionId }
module.exports.updateAttendanceCode = async (req, res) => {
  try {
    const { attendanceSessionId } = req.body;
    const teacherId = req.userId;

    if (!attendanceSessionId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const session = await AttendanceSession.findById(attendanceSessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (String(session.teacherId) !== String(teacherId)) {
      return res.status(403).json({ message: "Bạn không có quyền cập nhật mã cho phiên này" });
    }

    const rawCode = generateRandomCode(6);
    session.codeHash = hashCode(rawCode);
    await session.save();

    return res.status(200).json({
      data: {
        attendanceSessionId: session._id,
        slotId: session.slotId,
        code: rawCode,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

