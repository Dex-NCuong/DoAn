const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Middleware để bảo vệ route, yêu cầu người dùng đã đăng nhập
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Kiểm tra token trong headers
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
      console.log("Token từ Authorization header:", token);
    }

    // Nếu không có token
    if (!token) {
      console.log("Không tìm thấy token trong request");
      return res.status(401).json({
        success: false,
        message: "Không được phép truy cập, vui lòng đăng nhập",
      });
    }

    try {
      // Verify token
      console.log("Verifying token với JWT_SECRET:", process.env.JWT_SECRET);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Token đã được verify:", decoded);

      // Tìm user từ token
      const user = await User.findById(decoded.id);

      if (!user) {
        console.log("Không tìm thấy user với ID:", decoded.id);
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy người dùng với token này",
        });
      }

      // Kiểm tra trạng thái tài khoản
      if (user.status === false) {
        return res.status(403).json({
          success: false,
          message:
            "Tài khoản của bạn đã bị cấm. Vui lòng liên hệ Fanpage để được hỗ trợ.",
          banned: true,
        });
      }

      req.user = user;
      console.log("User đã được set vào request:", user.name);
      next();
    } catch (error) {
      console.error("Lỗi verify token:", error);
      return res.status(401).json({
        success: false,
        message: "Token không hợp lệ hoặc đã hết hạn",
      });
    }
  } catch (error) {
    console.error("Lỗi middleware protect:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// Middleware để giới hạn truy cập theo vai trò
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // Kiểm tra xem user đã login chưa
    if (!req.user) {
      console.log("Không tìm thấy user trong request khi authorize");
      return res.status(401).json({
        success: false,
        message: "Vui lòng đăng nhập trước",
      });
    }

    console.log("Kiểm tra quyền của user:", req.user.role, "cần quyền:", roles);
    if (!roles.includes(req.user.role)) {
      console.log("User không có quyền cần thiết");
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền thực hiện hành động này",
      });
    }

    console.log("User có đủ quyền");
    next();
  };
};
