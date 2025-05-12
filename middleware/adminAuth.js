const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Middleware to verify if the request is from an admin user
 * Used for API routes that require admin privileges
 */
module.exports = async function (req, res, next) {
  // Get token from header
  const token = req.header("Authorization")?.replace("Bearer ", "");

  // Check if no token
  if (!token) {
    return res
      .status(401)
      .json({ msg: "Không có token, quyền truy cập bị từ chối" });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by id
    const user = await User.findById(decoded.id).select("-password");

    // Check if user exists
    if (!user) {
      return res.status(401).json({ msg: "Người dùng không tồn tại" });
    }

    // Check if user is admin
    if (!user.isAdmin && user.role !== "admin") {
      return res.status(403).json({ msg: "Không có quyền truy cập" });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (err) {
    console.error("Admin auth error:", err.message);
    res.status(401).json({ msg: "Token không hợp lệ" });
  }
};
