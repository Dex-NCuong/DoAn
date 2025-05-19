const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Login page (view)
router.get("/login", authController.getLoginPage);

// Register page (view)
router.get("/register", authController.getRegisterPage);

// Process login (API - JSON response)
router.post("/login", authController.login);

// Process registration (API - JSON response)
router.post("/register", authController.register);

// Get current user (API - JSON response)
router.get("/me", authController.getCurrentUser);

// Logout
router.get("/logout", authController.logout);

// Add this route to handle token refresh
router.post("/refresh", async (req, res) => {
  try {
    // Get the old token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Không có token xác thực",
      });
    }

    // Extract the token
    const oldToken = authHeader.split(" ")[1];

    let userId;

    // Verify the old token, but allow expired tokens
    try {
      // First try normal verification
      const decoded = jwt.verify(
        oldToken,
        process.env.JWT_SECRET || "your_jwt_secret"
      );
      userId = decoded.id || (decoded.user && decoded.user.id);
    } catch (err) {
      // If token is expired, try to decode it without verification
      if (err.name === "TokenExpiredError") {
        const decoded = jwt.decode(oldToken);
        userId = decoded.id || (decoded.user && decoded.user.id);
      } else {
        // For other errors, reject the token
        throw err;
      }
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Token không hợp lệ hoặc không chứa ID người dùng",
      });
    }

    // Find user in database
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    // Generate new token
    const payload = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "1h" }
    );

    // Send back new token and user data
    res.json({
      success: true,
      message: "Token đã được làm mới",
      token,
      user,
    });
  } catch (err) {
    console.error("Error refreshing token:", err);
    res.status(401).json({
      success: false,
      message: "Không thể làm mới token",
      error: err.message,
    });
  }
});

router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

// Xác thực email
router.get("/verify-email", authController.verifyEmail);

module.exports = router;
