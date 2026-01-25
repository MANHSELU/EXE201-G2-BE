const User = require("../../model/Users");
const Role = require("../../model/Role");
const { generateToken } = require("../../jwt/Jwt");
const bcrypt = require("bcryptjs");

module.exports.loginController = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email và password là bắt buộc" });
    }

    // Tìm user theo email và select password + populate roleId
    const user = await User.findOne({ email }).select("+password").populate("roleId");
    if (!user) {
      return res.status(404).json({ message: "Email không tồn tại" });
    }

    // So sánh password với bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Mật khẩu không chính xác" });
    }

    // Tạo token với userId và role name
    const token = generateToken(user._id, user.roleId.name);

    return res.status(200).json({
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.roleId.name,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};
