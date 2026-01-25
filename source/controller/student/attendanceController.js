const crypto = require("crypto");
const AttendanceSession = require("../../model/AttendanceSession");
const AttendanceRecord = require("../../model/AttendanceRecord");
const ScheduleSlot = require("../../model/ScheduleSlot");
const networkCheck = require("../../middleware/networkCheck");

const hashCode = (code) => {
  return crypto.createHash("sha256").update(code).digest("hex");
};

// POST /api/student/attendance/checkin
// body: { slotId, attendanceSessionId, code, faceImageUrl, faceConfidence }
// middleware networkCheck nên được gắn ở route layer
module.exports.checkinWithFace = async (req, res) => {
  try {
    const { slotId, attendanceSessionId, sessionId, code, faceImageUrl, faceConfidence } = req.body;
    const studentId = req.userId;
    const resolvedSessionId = attendanceSessionId || sessionId;

    if (!slotId || !resolvedSessionId || !code) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const session = await AttendanceSession.findById(resolvedSessionId).select("+codeHash");
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // kiểm tra thuộc cùng slot
    if (String(session.slotId) !== String(slotId)) {
      return res.status(400).json({ message: "Slot không khớp với session" });
    }

    const now = new Date();
    if (now < session.startTime || now > session.endTime) {
      return res.status(400).json({ message: "Phiên điểm danh đã hết hạn hoặc chưa bắt đầu" });
    }

    // validate mã QR (hash)
    const inputHash = hashCode(code);
    if (inputHash !== session.codeHash) {
      return res.status(400).json({ message: "Mã điểm danh không đúng" });
    }

    // Ở đây giả định nhận diện khuôn mặt đã được xử lý ở client hoặc service ngoài,
    // BE chỉ nhận lại confidence.
    const status = faceConfidence && faceConfidence >= 0.8 ? "PRESENT" : "ABSENT";

    const record = await AttendanceRecord.findOneAndUpdate(
      { sessionId: resolvedSessionId, studentId },
      {
        sessionId: resolvedSessionId,
        slotId,
        studentId,
        status,
        faceImageUrl,
        faceConfidence,
        checkinTime: new Date(),
      },
      { upsert: true, new: true },
    );

    return res.status(200).json({ data: record });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

