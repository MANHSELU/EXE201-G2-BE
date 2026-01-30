const crypto = require("crypto");
const AttendanceSession = require("../../model/AttendanceSession");
const AttendanceRecord = require("../../model/AttendanceRecord");
const CheatingReport = require("../../model/CheatingReport");
const ScheduleSlot = require("../../model/ScheduleSlot");
const ClassStudent = require("../../model/ClassStudent");

const hashCode = (code) => {
  return crypto.createHash("sha256").update(code).digest("hex");
};

// ============ CẤU HÌNH ============
// Đặt DEV_MODE = true để bỏ qua kiểm tra vị trí khi test
const DEV_MODE = true;

// Cấu hình vị trí trường (có thể chuyển vào config/database sau)
const SCHOOL_LOCATION = {
  lat: 10.8411,      // Vĩ độ trường
  lng: 106.8098,     // Kinh độ trường
  radius: 500,       // Bán kính cho phép (mét)
};
// ===================================

// Hàm tính khoảng cách (Haversine)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// POST /api/student/attendance/verify-code
// Bước 1: Xác thực mã OTP - Sinh viên chỉ cần nhập mã, backend tự tìm session
module.exports.verifyCode = async (req, res) => {
  try {
    const { code } = req.body;
    const studentId = req.userId;

    if (!code) {
      return res.status(400).json({ message: "Vui lòng nhập mã điểm danh" });
    }

    // Hash mã để so sánh
    const inputHash = hashCode(code.toUpperCase());
    const now = new Date();

    // Tìm tất cả session đang active (trong thời gian hiệu lực)
    const activeSessions = await AttendanceSession.find({
      startTime: { $lte: now },
      endTime: { $gte: now },
    }).select("+codeHash");

    // Tìm session có mã khớp
    let matchedSession = null;
    for (const session of activeSessions) {
      if (session.codeHash === inputHash) {
        matchedSession = session;
        break;
      }
    }

    if (!matchedSession) {
      return res.status(400).json({ 
        message: "Mã điểm danh không đúng hoặc đã hết hạn" 
      });
    }

    // Lấy thông tin slot để kiểm tra sinh viên có thuộc lớp không
    const slot = await ScheduleSlot.findById(matchedSession.slotId)
      .populate("subjectId")
      .populate("classId")
      .populate("roomId");

    if (!slot) {
      return res.status(404).json({ message: "Không tìm thấy thông tin buổi học" });
    }

    // Kiểm tra sinh viên có thuộc lớp của slot này không
    const isStudentInClass = await ClassStudent.findOne({
      classId: slot.classId._id,
      studentId: studentId,
    });

    if (!isStudentInClass) {
      return res.status(403).json({ 
        message: "Bạn không thuộc lớp học này. Vui lòng kiểm tra lại mã điểm danh.",
        details: `Mã này dành cho lớp ${slot.classId.name}`
      });
    }

    // Kiểm tra đã điểm danh chưa
    const existingRecord = await AttendanceRecord.findOne({
      sessionId: matchedSession._id,
      studentId: studentId,
      status: "PRESENT"
    });

    if (existingRecord) {
      return res.status(400).json({ 
        message: "Bạn đã điểm danh cho buổi học này rồi!",
        alreadyCheckedIn: true
      });
    }

    // Trả về thông tin session và slot để frontend sử dụng
    return res.status(200).json({ 
      success: true, 
      message: "Mã hợp lệ! Tiếp tục xác thực khuôn mặt.",
      data: {
        sessionId: matchedSession._id,
        slotId: slot._id,
        subjectName: slot.subjectId?.name || "N/A",
        subjectCode: slot.subjectId?.code || "N/A",
        className: slot.classId?.name || "N/A",
        roomName: slot.roomId?.name || "N/A",
        startTime: slot.startTime,
        endTime: slot.endTime,
        date: slot.date,
      },
      schoolLocation: SCHOOL_LOCATION
    });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/student/attendance/my-records
// Lấy tất cả bản ghi điểm danh của sinh viên
module.exports.getMyAttendanceRecords = async (req, res) => {
  try {
    const studentId = req.userId;

    const records = await AttendanceRecord.find({ studentId })
      .populate({
        path: "slotId",
        populate: [
          { path: "subjectId", select: "name code" },
          { path: "classId", select: "name" },
          { path: "roomId", select: "name" },
        ],
      })
      .sort({ checkinTime: -1 })
      .lean();

    return res.json({ data: records });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/student/attendance/slot/:slotId
// Kiểm tra trạng thái điểm danh của 1 slot cụ thể
module.exports.getSlotAttendanceStatus = async (req, res) => {
  try {
    const studentId = req.userId;
    const { slotId } = req.params;

    const record = await AttendanceRecord.findOne({ 
      studentId, 
      slotId 
    }).lean();

    // Kiểm tra xem slot có session đang active không
    const now = new Date();
    const activeSession = await AttendanceSession.findOne({
      slotId,
      startTime: { $lte: now },
      endTime: { $gte: now },
    });

    return res.json({
      data: {
        hasAttended: record?.status === "PRESENT",
        record: record || null,
        hasActiveSession: !!activeSession,
        sessionInfo: activeSession
          ? {
              sessionId: activeSession._id,
              startTime: activeSession.startTime,
              endTime: activeSession.endTime,
            }
          : null,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/student/attendance/checkin
// Bước cuối: Check-in với face recognition
module.exports.checkinWithFace = async (req, res) => {
  try {
    const { 
      slotId, 
      attendanceSessionId, 
      sessionId, 
      code, 
      faceImage,
      faceImageUrl, 
      faceConfidence,
      location,
      livenessCompleted 
    } = req.body;
    
    const studentId = req.userId;
    const resolvedSessionId = attendanceSessionId || sessionId;

    if (!slotId || !resolvedSessionId || !code) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
    }

    const session = await AttendanceSession.findById(resolvedSessionId).select("+codeHash");
    if (!session) {
      return res.status(404).json({ message: "Phiên điểm danh không tồn tại" });
    }

    // Kiểm tra slot
    if (String(session.slotId) !== String(slotId)) {
      return res.status(400).json({ message: "Slot không khớp với session" });
    }

    // Kiểm tra thời gian
    const now = new Date();
    if (now < session.startTime || now > session.endTime) {
      return res.status(400).json({ message: "Phiên điểm danh đã hết hạn hoặc chưa bắt đầu" });
    }

    // Xác thực mã
    const inputHash = hashCode(code);
    if (inputHash !== session.codeHash) {
      return res.status(400).json({ message: "Mã điểm danh không đúng" });
    }

    // Kiểm tra vị trí (nếu có) - Bỏ qua nếu DEV_MODE = true
    let locationValid = true;
    if (!DEV_MODE && location && location.lat && location.lng) {
      const distance = calculateDistance(
        location.lat,
        location.lng,
        SCHOOL_LOCATION.lat,
        SCHOOL_LOCATION.lng
      );
      locationValid = distance <= SCHOOL_LOCATION.radius;
    }

    // Kiểm tra liveness (nếu có) - Bỏ qua nếu DEV_MODE = true
    const livenessValid = DEV_MODE || (livenessCompleted && livenessCompleted.length >= 3);

    // Face Recognition - kết quả từ face-api.js ở frontend
    // Frontend đã so sánh face descriptor với dữ liệu đã đăng ký
    const { faceVerified, faceMatchRate } = req.body;
    let faceMatchScore = 0;
    let isCheating = false;

    if (faceVerified === true) {
      // Frontend đã xác thực thành công bằng face-api.js
      faceMatchScore = faceMatchRate || 0.95;
      console.log(`[Attendance] Face verified for student ${studentId}, matchRate: ${faceMatchScore}`);
    } else if (faceImage) {
      // Fallback: nếu có ảnh nhưng không có faceVerified, cho điểm thấp
      faceMatchScore = 0.3;
    }

    // Xác định trạng thái điểm danh
    let status = "ABSENT";
    if (faceMatchScore >= 0.8 && locationValid && livenessValid) {
      status = "PRESENT";
    } else if (!locationValid) {
      status = "INVALID_LOCATION";
    }

    // Nếu phát hiện gian lận, tạo report
    if (isCheating) {
      try {
        await CheatingReport.create({
          studentId,
          slotId,
          sessionId: resolvedSessionId,
          type: "SPOOFING_DETECTED",
          evidence: faceImage ? faceImage.substring(0, 500) : null,
          description: "Phát hiện nghi ngờ sử dụng ảnh/video để điểm danh",
          createdAt: new Date(),
        });
      } catch (reportErr) {
        // Lỗi khi tạo report, không block flow chính
      }

      return res.status(400).json({
        success: false,
        cheatingDetected: true,
        message: "Phát hiện hành vi gian lận. Báo cáo đã được gửi đến Admin.",
      });
    }

    // Lưu record điểm danh
    const record = await AttendanceRecord.findOneAndUpdate(
      { sessionId: resolvedSessionId, studentId },
      {
        sessionId: resolvedSessionId,
        slotId,
        studentId,
        status,
        faceImageUrl: faceImage ? `face_${studentId}_${Date.now()}` : faceImageUrl,
        faceConfidence: faceMatchScore,
        checkinTime: new Date(),
        locationLat: location?.lat,
        locationLng: location?.lng,
        livenessCompleted: livenessCompleted?.join(","),
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({ 
      success: status === "PRESENT",
      data: record,
      message: status === "PRESENT" 
        ? "Điểm danh thành công!" 
        : "Điểm danh thất bại. Vui lòng thử lại."
    });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

