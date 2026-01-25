// middleware/auth.js
const { getTokenFromHeader, verifyToken, getUserId } = require("../jwt/Jwt");

// authMiddleware nhận mảng role
const authMiddleware = (roles = []) => {
  return (req, res, next) => {
    const token = getTokenFromHeader(req);
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ message: "Invalid or expired token" });

    req.userId = getUserId(token);
    req.userRole = decoded.role; // Lấy role từ payload

    // Kiểm tra role
    if (roles.length && !roles.includes(decoded.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    next();
  };
};

module.exports = authMiddleware;
