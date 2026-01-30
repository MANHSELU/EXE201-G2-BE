const FaceData = require("../../model/FaceData");

const FACE_SERVICE_URL = process.env.FACE_SERVICE_URL || "http://localhost:8001";

// Proxy: GET /api/student/face/health -> Face Service /health
module.exports.faceServiceHealth = async (req, res) => {
  try {
    const response = await fetch(`${FACE_SERVICE_URL}/health`);
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error("[FaceData] Health proxy error:", err);
    return res.status(502).json({
      status: "unhealthy",
      message: "Face Service không phản hồi",
    });
  }
};

// Proxy: POST /api/student/face/detect -> Face Service /detect (qua BE để có auth)
module.exports.detectFaceImage = async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, message: "Thiếu ảnh", detected: false });
    }
    const response = await fetch(`${FACE_SERVICE_URL}/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image }),
    });
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error("[FaceData] Detect proxy error:", err);
    return res.status(502).json({
      success: false,
      detected: false,
      message: "Không kết nối được Face Service. Kiểm tra face-service đã chạy chưa.",
    });
  }
};

// Proxy: POST /api/student/face/verify-image -> Face Service /verify (so sánh qua BE, studentId từ token)
module.exports.verifyFaceImage = async (req, res) => {
  try {
    const studentId = req.userId; // từ token, không cho frontend gửi studentId khác
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, matched: false, confidence: 0 });
    }
    const response = await fetch(`${FACE_SERVICE_URL}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: String(studentId), image }),
    });
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error("[FaceData] Verify-image proxy error:", err);
    return res.status(502).json({
      success: false,
      matched: false,
      confidence: 0,
      message: "Không kết nối được Face Service.",
    });
  }
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
