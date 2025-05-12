const express = require("express");
const router = express.Router();
const { register, login, getMe } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

// Debug middleware cho login route
router.post(
  "/login",
  (req, res, next) => {
    console.log("Nhận request login:", {
      body: req.body,
      headers: req.headers["content-type"],
    });

    // Kiểm tra body có email và password không
    if (!req.body || !req.body.email || !req.body.password) {
      console.error("Body không hợp lệ:", req.body);
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin đăng nhập (email/password)",
      });
    }

    next();
  },
  login
);

router.post("/register", register);
router.get("/me", protect, getMe);

module.exports = router;
