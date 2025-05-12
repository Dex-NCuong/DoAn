const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Tạo token JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// @desc    Đăng ký người dùng mới
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    console.log("Request body:", req.body);
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      console.log("Dữ liệu đầu vào thiếu:", {
        name,
        email,
        password: password ? "Có" : "Không",
      });
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp đầy đủ thông tin (tên, email, mật khẩu)",
      });
    }

    // Kiểm tra email đã tồn tại chưa
    console.log("Kiểm tra email đã tồn tại:", email);
    const userExists = await User.findOne({ email });

    if (userExists) {
      console.log("Email đã tồn tại:", email);
      return res.status(400).json({
        success: false,
        message: "Email đã được sử dụng",
      });
    }

    // Tạo người dùng mới
    console.log("Tạo người dùng mới:", { name, email });
    const user = await User.create({
      name,
      email,
      password,
      coins: 50, // Người dùng mới được tặng 50 xu
    });

    if (user) {
      console.log("Đăng ký thành công, user ID:", user._id);
      res.status(201).json({
        success: true,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          coins: user.coins,
        },
        token: generateToken(user._id),
      });
    } else {
      console.log("Tạo user thất bại nhưng không có lỗi");
      res.status(400).json({
        success: false,
        message: "Dữ liệu người dùng không hợp lệ",
      });
    }
  } catch (error) {
    console.error("Lỗi đăng ký:", error);
    console.error(error.stack);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi đăng ký",
      error: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

// @desc    Đăng nhập
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    console.log("[Login Controller] Processing login request");

    const { email, password } = req.body;
    console.log("[Login Controller] Email:", email);

    // Kiểm tra email và lấy thông tin user kèm password
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      console.log(`[Login Controller] User not found with email: ${email}`);
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không chính xác",
      });
    }

    // Kiểm tra mật khẩu
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      console.log(`[Login Controller] Password incorrect for user: ${email}`);
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không chính xác",
      });
    }

    console.log(`[Login Controller] Login successful for user: ${email}`);

    // Đảm bảo gửi Content-Type
    res.set("Content-Type", "application/json");

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        coins: user.coins,
      },
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("[Login Controller] Login error:", error);
    // Đảm bảo gửi Content-Type
    res.set("Content-Type", "application/json");
    res.status(500).json({
      success: false,
      message: "Lỗi server khi đăng nhập",
      error: error.message,
    });
  }
};

// @desc    Lấy thông tin người dùng hiện tại
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password")
      .populate("favoriteStories", "title cover")
      .populate({
        path: "readingHistory.story",
        select: "title cover",
      })
      .populate({
        path: "readingHistory.lastChapter",
        select: "title number",
      });

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Lỗi lấy thông tin user:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};
