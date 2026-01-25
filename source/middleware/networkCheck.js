// middleware/networkCheck.js
// Ràng buộc IP mạng trường / khu vực cho các API điểm danh

const ALLOWED_PREFIXES = (process.env.ALLOWED_IP_PREFIXES || "")
  .split(",")
  .map((p) => p.trim())
  .filter(Boolean);

const networkCheck = (req, res, next) => {
  if (!ALLOWED_PREFIXES.length) {
    // Nếu chưa cấu hình thì cho qua (tránh chặn dev)
    return next();
  }

  const ip =
    req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
    req.connection?.remoteAddress ||
    req.ip;

  const ok = ALLOWED_PREFIXES.some((prefix) => ip.startsWith(prefix));

  if (!ok) {
    return res.status(403).json({ message: "Bạn phải kết nối mạng trường để điểm danh" });
  }

  next();
};

module.exports = networkCheck;

