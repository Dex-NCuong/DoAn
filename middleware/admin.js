const User = require("../models/User");

/**
 * Middleware to check if user is an admin
 * This should be used after the auth middleware
 */
module.exports = async function (req, res, next) {
  try {
    // Check if req.user exists (auth middleware should have set this)
    if (!req.user) {
      return res.status(401).json({ msg: "Không có quyền truy cập" });
    }

    // In development mode, bypass admin check if X-Dev-Mode header is present
    const isDevMode =
      req.hostname === "localhost" || req.hostname === "127.0.0.1";
    const hasDevHeader = req.headers["x-dev-mode"] === "true";

    if (isDevMode && hasDevHeader) {
      console.log("[DEV MODE] Bypassing admin check");
      return next();
    }

    // Check if user is admin
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: "Không tìm thấy người dùng" });
    }

    if (!user.isAdmin) {
      return res.status(403).json({ msg: "Cần có quyền quản trị" });
    }

    next();
  } catch (err) {
    console.error("Lỗi trong admin middleware:", err);
    res.status(500).json({ msg: "Lỗi máy chủ" });
  }
};
