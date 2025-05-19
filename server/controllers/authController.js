const jwt = require("jsonwebtoken");
const User = require("../models/User");
const nodemailer = require("nodemailer");

// Tạo token JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// Hàm gửi email xác thực
async function sendVerificationEmail(email, token) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  const link = `http://localhost:3200/verify-email.html?token=${token}`;
  await transporter.sendMail({
    from: "TruyenHay <no-reply@truyenhay.com>",
    to: email,
    subject: "Xác thực email",
    html: `<p>Nhấn vào nút bên dưới để xác thực email:</p><a href="${link}"><button style='padding:10px 20px;background:#007bff;color:#fff;border:none;border-radius:5px;'>Xác thực</button></a>`,
  });
}

// @desc    Đăng ký người dùng mới
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Vui lòng cung cấp đầy đủ thông tin (tên đăng nhập, email, mật khẩu)",
      });
    }
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "Email đã được sử dụng",
      });
    }
    // Tạo user với isVerified: false
    await User.create({
      username,
      email,
      password,
      coins: 50,
      isVerified: false,
    });
    // Tạo token xác thực
    const token = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    // Gửi email xác thực
    await sendVerificationEmail(email, token);
    // Không trả về user và token ở đây!
    res.status(201).json({
      success: true,
      message: "Hãy xác thực email của bạn! Vui lòng kiểm tra hộp thư.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi server khi đăng ký",
      error: error.message,
    });
  }
};

// @desc    Xác thực email
// @route   GET /api/auth/verify-email?token=...
// @access  Public
exports.verifyEmail = async (req, res) => {
  const { token } = req.query;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ email: decoded.email });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Người dùng không tồn tại" });
    }
    if (user.isVerified) {
      return res.json({
        success: true,
        message: "Email đã được xác thực trước đó.",
      });
    }
    user.isVerified = true;
    await user.save();
    return res.json({ success: true, message: "Xác thực email thành công!" });
  } catch (err) {
    return res
      .status(400)
      .json({ success: false, message: "Token không hợp lệ hoặc đã hết hạn." });
  }
};

// @desc    Đăng nhập
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không chính xác",
      });
    }
    // Kiểm tra xác thực email
    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message: "Bạn cần xác thực email trước khi đăng nhập!",
      });
    }
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không chính xác",
      });
    }
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
