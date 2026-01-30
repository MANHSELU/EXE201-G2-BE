const mongoose = require("mongoose");

const faceDataSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    unique: true, // Mỗi sinh viên chỉ có 1 bản ghi
  },
  // Lưu face embeddings/encodings (vector số) từ AI model
  // Không lưu ảnh trực tiếp để bảo mật
  faceEncodings: [{
    type: [Number], // Array of numbers representing face encoding
    required: true,
  }],
  // Số lượng ảnh đã đăng ký
  imageCount: {
    type: Number,
    default: 0,
  },
  // Liveness challenges đã hoàn thành khi đăng ký
  livenessCompleted: {
    type: [String],
    default: [],
  },
  // Trạng thái
  status: {
    type: String,
    enum: ["PENDING", "ACTIVE", "BLOCKED", "EXPIRED"],
    default: "ACTIVE",
  },
  // Metadata
  registeredAt: {
    type: Date,
    default: Date.now,
  },
  lastUsedAt: {
    type: Date,
  },
  deviceInfo: {
    type: String,
  },
  // Để sau này có thể yêu cầu đăng ký lại
  expiresAt: {
    type: Date,
  },
});

// Index để tìm kiếm nhanh
faceDataSchema.index({ studentId: 1 });
faceDataSchema.index({ status: 1 });

module.exports = mongoose.model("FaceData", faceDataSchema);
