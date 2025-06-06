const User = require("../models/User");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");

async function generateUniqueUserId() {
  let userId;
  let exists = true;
  while (exists) {
    userId = Math.floor(1000000 + Math.random() * 9000000).toString();
    exists = await User.exists({ userId });
  }
  return userId;
}

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

// Register new user
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).header("Content-Type", "application/json").json({
        success: false,
        message: "Vui lòng cung cấp đầy đủ username, email và password.",
      });
    }
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).header("Content-Type", "application/json").json({
        success: false,
        message:
          "Kết nối với cơ sở dữ liệu bị gián đoạn. Vui lòng thử lại sau.",
      });
    }
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).header("Content-Type", "application/json").json({
        success: false,
        message: "Tài khoản hoặc email đã tồn tại!",
      });
    }
    const userId = await generateUniqueUserId();
    const user = new User({
      username,
      email,
      password,
      coins: 0,
      avatar: "images/default-avatar.jpg",
      userId,
      isVerified: false,
    });
    await user.save();
    // Tạo token xác thực
    const token = jwt.sign(
      { email },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "1h" }
    );
    await sendVerificationEmail(email, token);
    // Chỉ trả về message xác thực email, không trả về user/token
    res.status(201).header("Content-Type", "application/json").json({
      success: true,
      message: "Hãy xác thực email của bạn! Vui lòng kiểm tra hộp thư.",
    });
  } catch (error) {
    res.status(500).header("Content-Type", "application/json").json({
      success: false,
      message: "Đã xảy ra lỗi khi đăng ký tài khoản.",
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({
      $or: [{ username: email }, { email }],
    });

    if (!user) {
      return res.status(401).header("Content-Type", "application/json").json({
        success: false,
        message: "Tài khoản không tồn tại!",
      });
    }

    // Check xác thực email
    if (!user.isVerified) {
      return res.status(401).header("Content-Type", "application/json").json({
        success: false,
        message: "Bạn cần xác thực email trước khi đăng nhập!",
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).header("Content-Type", "application/json").json({
        success: false,
        message: "Mật khẩu không đúng!",
      });
    }

    // Set session
    req.session.userId = user._id;
    req.session.username = user.username;
    req.session.userRole = user.role;

    // Create safe user object (without password)
    const safeUser = {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      coins: user.coins,
      avatar: user.avatar || "images/default-avatar.jpg",
      status: user.status,
    };

    // Create JWT token
    const payload = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
    };

    // Use environment variable for secret key or a fallback
    const secret = process.env.JWT_SECRET || "your_jwt_secret";

    // Generate token with expiration of 1 hour
    const token = jwt.sign(payload, secret, { expiresIn: "1h" });

    console.log("Generated JWT token for user:", user.username);

    // Return JSON response with user info and token
    res.status(200).header("Content-Type", "application/json").json({
      success: true,
      message: "Đăng nhập thành công!",
      user: safeUser,
      token: token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).header("Content-Type", "application/json").json({
      success: false,
      message: "Đã xảy ra lỗi khi đăng nhập.",
    });
  }
};

// Logout user
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Session destruction error:", err);
    }
    res.redirect("/");
  });
};

// Render login page
exports.getLoginPage = (req, res) => {
  if (req.session.userId) {
    return res.redirect("/");
  }
  res.render("auth/login", { title: "Đăng nhập" });
};

// Render register page
exports.getRegisterPage = (req, res) => {
  if (req.session.userId) {
    return res.redirect("/");
  }
  res.render("auth/register", { title: "Đăng ký" });
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    let userId;

    // Check for authentication via token in header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        // In a real app, you would verify the token with JWT
        // For now, we'll assume the token is valid and handle session-based auth as a fallback

        // Get user from existing session
        userId = req.session.userId;
      } catch (err) {
        console.error("Token verification error:", err);
      }
    } else {
      // Get user from session as fallback
      userId = req.session.userId;
    }

    // If no user ID found from either method
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Không có phiên đăng nhập nào",
      });
    }

    // Get user from database
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    // Create safe user object (without password)
    const safeUser = {
      _id: user._id,
      userId: user.userId,
      username: user.username,
      email: user.email,
      role: user.role,
      coins: user.coins,
      avatar: user.avatar,
      status: user.status,
    };

    // Return user data
    res.status(200).json({
      success: true,
      user: safeUser,
    });
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy thông tin người dùng",
    });
  }
};

// Quên mật khẩu - gửi email reset
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email)
    return res.json({ success: false, message: "Vui lòng nhập email." });
  const user = await User.findOne({ email });
  if (!user)
    return res.json({
      success: true,
      message: "Nếu email tồn tại, liên kết đã được gửi.",
    });
  // Tạo token reset có hạn 10 phút
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "secret", {
    expiresIn: "10m",
  });
  user.resetPasswordToken = token;
  user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
  await user.save();
  // Gửi email
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  const resetUrl = `${req.protocol}://${req.get(
    "host"
  )}/reset-password.html?token=${token}`;
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: "Đặt lại mật khẩu TruyenHay",
    html: `<p>Bạn vừa yêu cầu đặt lại mật khẩu. Nhấn vào <a href='${resetUrl}'>đây</a> để đặt lại. Liên kết có hiệu lực 10 phút.</p>`,
  });
  res.json({
    success: true,
    message: "Nếu email tồn tại, liên kết đã được gửi.",
  });
};

// Đặt lại mật khẩu mới
exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password)
    return res.json({ success: false, message: "Thiếu token hoặc mật khẩu." });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    const user = await User.findOne({
      _id: decoded.id,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user)
      return res.json({
        success: false,
        message: "Token không hợp lệ hoặc đã hết hạn.",
      });
    console.log("Before reset - User password:", user.password);
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    console.log("After reset - User password:", user.password);
    res.json({ success: true, message: "Đặt lại mật khẩu thành công." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.json({
      success: false,
      message: "Token không hợp lệ hoặc đã hết hạn.",
    });
  }
};

// Xác thực email
exports.verifyEmail = async (req, res) => {
  const { token } = req.query;
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your_jwt_secret"
    );
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
