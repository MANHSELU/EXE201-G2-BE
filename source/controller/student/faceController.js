const FaceData = require("../../model/FaceData");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const LIVENESS_TTL_MS = 90 * 1000;
const LIVENESS_TOKEN_TTL = "5m";
const LIVENESS_CHALLENGES = [
  "TURN_LEFT",
  "TURN_RIGHT",
  "LOOK_UP",
  "LOOK_DOWN",
  "OPEN_MOUTH",
];

const livenessSessions = new Map();

const pickRandomChallenges = (count = 4) => {
  const copy = [...LIVENESS_CHALLENGES];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
};

// POST /api/student/face/register
// Lưu dữ liệu khuôn mặt (face descriptors) vào database
module.exports.registerFace = async (req, res) => {
  try {
    const studentId = req.userId;
    const { faceDescriptors, faceImage } = req.body;

    // Validate face descriptors
    if (!faceDescriptors || !Array.isArray(faceDescriptors) || faceDescriptors.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Cần ít nhất 3 mẫu khuôn mặt để đăng ký",
      });
    }

    // Validate mỗi descriptor phải là array 128 số
    for (let i = 0; i < faceDescriptors.length; i++) {
      if (!Array.isArray(faceDescriptors[i]) || faceDescriptors[i].length !== 128) {
        return res.status(400).json({
          success: false,
          message: `Mẫu khuôn mặt #${i + 1} không hợp lệ`,
        });
      }
    }

    // Kiểm tra xem đã có dữ liệu chưa
    const existingFace = await FaceData.findOne({ studentId });
    if (existingFace && existingFace.status === "ACTIVE") {
      // Cho phép cập nhật lại
      console.log(`[FaceData] Updating existing face data for student ${studentId}`);
    }

    // Lưu face descriptors vào database
    const faceData = await FaceData.findOneAndUpdate(
      { studentId },
      {
        studentId,
        faceEncodings: faceDescriptors, // Lưu tất cả descriptors
        imageCount: faceDescriptors.length,
        status: "ACTIVE",
        registeredAt: new Date(),
        deviceInfo: req.headers["user-agent"],
      },
      { upsert: true, new: true }
    );

    console.log(`[FaceData] Saved ${faceDescriptors.length} face descriptors for student ${studentId}`);

    return res.status(200).json({
      success: true,
      message: "Đăng ký khuôn mặt thành công!",
      data: {
        id: faceData._id,
        imageCount: faceData.imageCount,
        registeredAt: faceData.registeredAt,
      },
    });
  } catch (err) {
    console.error("[FaceData] Register error:", err);
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống. Vui lòng thử lại sau.",
    });
  }
};

// GET /api/student/face/status
// Kiểm tra trạng thái dữ liệu khuôn mặt
module.exports.getFaceStatus = async (req, res) => {
  try {
    const studentId = req.userId;

    const faceData = await FaceData.findOne({ studentId });

    if (!faceData || faceData.status !== "ACTIVE") {
      return res.status(200).json({
        success: true,
        data: {
          hasRegistered: false,
          message: "Chưa có dữ liệu khuôn mặt",
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        hasRegistered: true,
        status: faceData.status,
        registeredAt: faceData.registeredAt,
        imageCount: faceData.imageCount,
        lastUsedAt: faceData.lastUsedAt,
      }
    });
  } catch (err) {
    console.error("[FaceData] Status error:", err);
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống",
    });
  }
};

// GET /api/student/face/descriptors
// Lấy face descriptors đã lưu để so sánh khi điểm danh
module.exports.getFaceDescriptors = async (req, res) => {
  try {
    const studentId = req.userId;

    const faceData = await FaceData.findOne({ studentId, status: "ACTIVE" });

    if (!faceData) {
      return res.status(200).json({
        success: false,
        data: {
          hasRegistered: false,
          faceDescriptors: [],
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        hasRegistered: true,
        faceDescriptors: faceData.faceEncodings, // Trả về tất cả descriptors
        imageCount: faceData.imageCount,
      }
    });
  } catch (err) {
    console.error("[FaceData] Get descriptors error:", err);
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống",
    });
  }
};

// POST /api/student/face/verify
// So sánh khuôn mặt với dữ liệu đã đăng ký
module.exports.verifyFace = async (req, res) => {
  try {
    const studentId = req.userId;
    const { faceDescriptor, matchRate } = req.body;

    if (!faceDescriptor) {
      return res.status(400).json({
        success: false,
        message: "Thiếu dữ liệu khuôn mặt",
      });
    }

    // Lấy face data đã đăng ký
    const faceData = await FaceData.findOne({ studentId, status: "ACTIVE" });

    if (!faceData) {
      return res.status(400).json({
        success: false,
        message: "Chưa đăng ký khuôn mặt",
        needRegister: true,
      });
    }

    // So sánh face descriptor với các encodings đã lưu
    // Tính Euclidean distance và tìm min
    let minDistance = Infinity;
    
    for (const storedEncoding of faceData.faceEncodings) {
      let sumSquared = 0;
      for (let i = 0; i < 128; i++) {
        const diff = faceDescriptor[i] - storedEncoding[i];
        sumSquared += diff * diff;
      }
      const distance = Math.sqrt(sumSquared);
      if (distance < minDistance) {
        minDistance = distance;
      }
    }

    // Threshold cho face matching
    const threshold = 0.5;
    const isMatch = minDistance < threshold;

    // Cập nhật lastUsedAt nếu match
    if (isMatch) {
      await FaceData.updateOne(
        { studentId },
        { lastUsedAt: new Date() }
      );
    }

    console.log(`[FaceData] Verify: student=${studentId}, distance=${minDistance.toFixed(3)}, match=${isMatch}`);

    return res.status(200).json({
      success: isMatch,
      distance: minDistance,
      matchRate: matchRate || 0,
      message: isMatch ? "Xác thực khuôn mặt thành công" : "Khuôn mặt không khớp",
    });
  } catch (err) {
    console.error("[FaceData] Verify error:", err);
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống",
    });
  }
};

// DELETE /api/student/face/reset/:studentId (Admin only)
// Reset face data để đăng ký lại
module.exports.resetFace = async (req, res) => {
  try {
    const { studentId } = req.params;

    const result = await FaceData.findOneAndUpdate(
      { studentId },
      { status: "EXPIRED" }
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy dữ liệu khuôn mặt",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Đã reset dữ liệu khuôn mặt. Sinh viên có thể đăng ký lại.",
    });
  } catch (err) {
    console.error("[FaceData] Reset error:", err);
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống",
    });
  }
};

// GET /api/student/face/liveness-challenge
// Tạo challenge ngẫu nhiên + nonce chống replay
module.exports.getLivenessChallenge = async (req, res) => {
  try {
    const studentId = req.userId;
    const nonce = crypto.randomBytes(16).toString("hex");
    const challenges = pickRandomChallenges(3);

    livenessSessions.set(nonce, {
      studentId: String(studentId),
      challenges,
      createdAt: Date.now(),
      used: false,
    });

    return res.status(200).json({
      success: true,
      data: {
        nonce,
        challenges,
        expiresInMs: LIVENESS_TTL_MS,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Lỗi hệ thống" });
  }
};

// POST /api/student/face/liveness-verify
// Xác nhận liveness + cấp livenessToken
module.exports.verifyLiveness = async (req, res) => {
  try {
    const studentId = String(req.userId);
    const { nonce, results, durationMs } = req.body || {};

    if (!nonce || !results) {
      return res.status(400).json({ success: false, message: "Thiếu dữ liệu liveness" });
    }

    const session = livenessSessions.get(nonce);
    if (!session) {
      return res.status(400).json({ success: false, message: "Nonce không hợp lệ" });
    }

    if (session.used) {
      livenessSessions.delete(nonce);
      return res.status(400).json({ success: false, message: "Nonce đã được sử dụng" });
    }

    if (session.studentId !== studentId) {
      return res.status(403).json({ success: false, message: "Không đúng user" });
    }

    if (Date.now() - session.createdAt > LIVENESS_TTL_MS) {
      livenessSessions.delete(nonce);
      return res.status(400).json({ success: false, message: "Challenge đã hết hạn" });
    }

    const allPassed = session.challenges.every((c) => results?.[c]?.pass === true);
    if (!allPassed) {
      return res.status(400).json({ success: false, message: "Liveness chưa đạt" });
    }

    livenessSessions.delete(nonce);

    const token = jwt.sign(
      {
        sub: studentId,
        type: "LIVENESS",
        nonce,
        durationMs: durationMs || null,
      },
      process.env.JWT_SECRET,
      { expiresIn: LIVENESS_TOKEN_TTL, algorithm: "HS256" }
    );

    return res.status(200).json({
      success: true,
      data: { livenessToken: token },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Lỗi hệ thống" });
  }
};
