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
    const expireTime = new Date(now.getTime() + 5 * 60 * 1000); // +5 phút

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
        endTime: expireTime,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/lecturer/attendance/recent
// Lấy các phiên điểm danh gần đây (2-3 ngày)
module.exports.getRecentAttendanceSessions = async (req, res) => {
  try {
    const teacherId = req.userId;
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    // Lấy các sessions của giáo viên trong 3 ngày gần nhất
    const sessions = await AttendanceSession.find({
      teacherId,
      createdAt: { $gte: threeDaysAgo },
    })
      .populate("slotId", "startTime endTime date subjectId classId")
      .populate("slotId.subjectId", "code name")
      .populate("slotId.classId", "name")
      .sort({ createdAt: -1 })
      .limit(10);

    // Tính số học sinh có mặt cho từng session
    const sessionsWithStats = await Promise.all(
      sessions.map(async (session) => {
        const AttendanceRecord = require("../../model/AttendanceRecord");
        const presentCount = await AttendanceRecord.countDocuments({
          sessionId: session._id,
          status: "PRESENT",
        });
        const totalCount = await AttendanceRecord.countDocuments({
          sessionId: session._id,
        });

        return {
          _id: session._id,
          slotId: session.slotId,
          startTime: session.startTime,
          endTime: session.endTime,
          createdAt: session.createdAt,
          presentCount,
          totalCount,
        };
      })
    );

    return res.status(200).json({
      data: sessionsWithStats,
    });
  } catch (err) {
    console.error("Error fetching recent sessions:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};