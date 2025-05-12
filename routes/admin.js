const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const storyController = require("../controllers/storyController");
const { isAuthenticated } = require("../middleware/auth");
const User = require("../models/User");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Đảm bảo thư mục uploads/covers tồn tại
const uploadDir = path.join(__dirname, "../public/uploads/covers");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Cấu hình multer cho upload ảnh
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "-"));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn 5MB
});

// Middleware for admin authorization
const isAdmin = async (req, res, next) => {
  try {
    // BYPASS ADMIN CHECK FOR TESTING
    console.log(
      "BYPASS ADMIN CHECK in routes/admin.js: Cho phép truy cập tạm thời"
    );
    next();
    return;

    // Disable code below for testing
    /*
    // Lưu ý: req.user đã được thiết lập bởi middleware isAuthenticated
    const userId = req.user.id || req.userId;

    // Kiểm tra quyền admin
    const user = await User.findById(userId);
    if (!user || (user.role !== "admin" && !user.isAdmin)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền truy cập trang này.",
      });
    }

    // Nếu là admin, tiếp tục
    next();
    */
  } catch (error) {
    console.error("Lỗi kiểm tra quyền admin:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi xác minh quyền admin.",
    });
  }
};

// Quản lý người dùng API (Thêm API endpoints cho phần quản lý người dùng)
router.get("/users", isAdmin, adminController.getAllUsers);
router.post("/users", isAdmin, adminController.createUser);
router.get("/users/:userId", isAdmin, adminController.getUserById);
router.put("/users/:userId", isAdmin, adminController.updateUser);
router.put("/users/:userId/status", isAdmin, adminController.toggleUserStatus);
router.delete("/users/:userId", isAdmin, adminController.deleteUser);
router.post(
  "/users/:userId/reset-password",
  isAdmin,
  adminController.resetUserPassword
);

// Thống kê tổng quan cho dashboard
router.get(
  "/dashboard/stats",
  isAuthenticated,
  isAdmin,
  adminController.getDashboardStats
);

// Giao dịch gần đây
router.get(
  "/transactions/recent",
  isAuthenticated,
  isAdmin,
  adminController.getRecentTransactions
);

// Chương đang chờ duyệt
router.get(
  "/chapters/pending",
  isAuthenticated,
  isAdmin,
  adminController.getPendingChapters
);

// Phê duyệt chương
router.put(
  "/chapters/:chapterId/approve",
  isAuthenticated,
  isAdmin,
  adminController.approveChapter
);

// Từ chối chương
router.put(
  "/chapters/:chapterId/reject",
  isAuthenticated,
  isAdmin,
  adminController.rejectChapter
);

// Thống kê xu đã bán
router.get(
  "/stats/coin-sales",
  isAuthenticated,
  isAdmin,
  adminController.getCoinSalesStats
);

// Thống kê người dùng mới
router.get(
  "/stats/new-users",
  isAuthenticated,
  isAdmin,
  adminController.getNewUsersStats
);

// Quản lý truyện
router.get(
  "/stories",
  isAuthenticated,
  isAdmin,
  storyController.getAdminStories
);
router.post(
  "/stories",
  upload.single("coverImage"),
  storyController.createStory
);
router.get(
  "/stories/:storyId",
  isAuthenticated,
  isAdmin,
  storyController.getStoryById
);
router.put(
  "/stories/:storyId",
  upload.single("coverImage"),
  storyController.updateStory
);
router.delete("/stories/:storyId", storyController.deleteStory);

// Lấy danh sách thể loại
router.get("/genres", isAuthenticated, isAdmin, storyController.getAllGenres);

module.exports = router;
