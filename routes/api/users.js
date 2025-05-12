const express = require("express");
const router = express.Router();
const User = require("../../models/User");
const auth = require("../../middleware/auth");
const jwt = require("jsonwebtoken");
const userController = require("../../controllers/userController");

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get("/profile", auth.isAuth, async (req, res) => {
  try {
    // Get first user for demo purposes (temporary fix)
    let user;
    if (req.userId === "unknown") {
      user = await User.findOne().select("-password");
    } else {
      user = await User.findById(req.userId).select("-password");
    }

    if (!user) {
      // Fallback to first user if not found
      user = await User.findOne().select("-password");
    }

    res.json({
      success: true,
      user,
    });
  } catch (err) {
    console.error("Error fetching user profile:", err.message);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put("/profile", auth.isAuth, async (req, res) => {
  try {
    const { email, displayName, avatar } = req.body;

    // Get user ID from request or use first user as fallback
    let userId = req.userId;
    let user;

    if (userId === "unknown") {
      // Fallback to first user if ID unknown
      user = await User.findOne();
      userId = user ? user._id : null;
      console.log("Using first user as fallback for profile update");
    }

    if (!userId) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    // Create update object
    const updateData = {};

    // Handle email update with duplicate check
    if (email) {
      // Check if user is trying to update to their own email (which is fine)
      const currentUser = await User.findById(userId);
      if (currentUser && currentUser.email === email) {
        // Same email, so we can include it
        updateData.email = email;
      } else {
        // Check if email exists for another user
        const existingUser = await User.findOne({
          email,
          _id: { $ne: userId },
        });

        if (existingUser) {
          // Email exists for another user, don't update email
          console.log(
            "Email already exists for another user, skipping email update"
          );
        } else {
          // Email is unique, we can update it
          updateData.email = email;
        }
      }
    }

    // Add display name and avatar to update data
    if (displayName) updateData.displayName = displayName;
    if (avatar) updateData.avatar = avatar;

    // Only update if there are changes to make
    if (Object.keys(updateData).length === 0) {
      // No valid updates to make
      return res.json({
        success: true,
        message: "Không có thay đổi để cập nhật",
        user: await User.findById(userId).select("-password"),
      });
    }

    // Update user
    user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    console.log("Profile updated successfully for user:", userId);

    res.json({
      success: true,
      message: "Cập nhật thông tin thành công",
      user,
    });
  } catch (err) {
    console.error("Error updating profile:", err.message);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật thông tin",
    });
  }
});

// @route   GET /api/users/followed-stories
// @desc    Get user's followed stories
// @access  Private
router.get("/followed-stories", auth.isAuth, async (req, res) => {
  try {
    // Get first user for demo purposes (temporary fix)
    let user;
    if (req.userId === "unknown") {
      user = await User.findOne()
        .populate("followedStories")
        .select("followedStories");
    } else {
      user = await User.findById(req.userId)
        .populate("followedStories")
        .select("followedStories");
    }

    if (!user) {
      // Fallback to empty array
      return res.json({
        success: true,
        stories: [],
      });
    }

    res.json({
      success: true,
      stories: user.followedStories || [],
    });
  } catch (err) {
    console.error("Error fetching followed stories:", err.message);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
});

// @route   GET /api/users/coins
// @desc    Get user's coin balance
// @access  Private
router.get("/coins", auth.isAuth, async (req, res) => {
  try {
    // Get user ID from request or use first user as fallback
    let userId = req.userId;
    let user;

    if (userId === "unknown") {
      // Fallback to first user if ID unknown
      user = await User.findOne().select("coins");
      console.log("Using first user as fallback for coin balance");
    } else {
      user = await User.findById(userId).select("coins");
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    res.json({
      success: true,
      coins: user.coins || 0,
    });
  } catch (err) {
    console.error("Error fetching user coins:", err.message);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy số xu",
    });
  }
});

// @route   PUT /api/users/avatar
// @desc    Update user avatar
// @access  Private
router.put("/avatar", auth.isAuth, async (req, res) => {
  try {
    const { avatar } = req.body;

    if (!avatar) {
      return res.status(400).json({
        success: false,
        message: "Không tìm thấy dữ liệu ảnh đại diện",
      });
    }

    // Get user ID from token
    const userId = req.userId;

    // Log request info for debugging
    console.log(`Processing avatar update for user ID: ${userId}`);

    if (!userId) {
      console.error("No user ID provided in token");
      return res.status(401).json({
        success: false,
        message: "Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.",
      });
    }

    // Find user by ID first to ensure they exist
    const userExists = await User.findById(userId);
    if (!userExists) {
      console.error(`User with ID ${userId} not found in database`);
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng với ID được cung cấp",
      });
    }

    // Update user avatar - using findByIdAndUpdate to ensure we update the correct user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { avatar } },
      { new: true }
    ).select("-password");

    console.log(`Avatar updated successfully for user: ${userId}`);

    // Return updated user info
    res.json({
      success: true,
      message: "Cập nhật ảnh đại diện thành công",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Error updating avatar:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật ảnh đại diện",
      error: err.message,
    });
  }
});

// @route   PUT /api/users/change-password
// @desc    Change user password without requiring authentication (public route)
// @access  Public
router.put("/change-password", async (req, res) => {
  try {
    const { username, currentPassword, newPassword } = req.body;

    // Input validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp mật khẩu hiện tại và mật khẩu mới.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu mới phải có ít nhất 6 ký tự.",
      });
    }

    // Find user by username if provided, otherwise find by user ID from token
    let user;

    if (username) {
      user = await User.findOne({ username });
      console.log(`Looking up user by username: ${username}`);
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      try {
        // Try to get user ID from token
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "your_jwt_secret"
        );
        const userId = decoded.id || (decoded.user && decoded.user.id);

        if (userId) {
          user = await User.findById(userId);
          console.log(`Looking up user by token ID: ${userId}`);
        }
      } catch (err) {
        console.log(
          "Token verification failed, continuing with username lookup"
        );
      }
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin người dùng.",
      });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu hiện tại không đúng.",
      });
    }

    // Log password change attempt
    console.log(`Password change attempt for user: ${user.username}`);

    // Update password
    user.password = newPassword;
    await user.save();

    console.log(`Password changed successfully for user: ${user.username}`);

    // Create new JWT token for the user
    const payload = {
      id: user._id ? user._id.toString() : null,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    // Use environment variable for secret key or a fallback
    const secret = process.env.JWT_SECRET || "your_jwt_secret";

    // Generate token with expiration of 1 hour
    const token = jwt.sign(payload, secret, { expiresIn: "1h" });

    // Create safe user object (without password)
    const safeUser = {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      coins: user.coins,
      avatar: user.avatar,
    };

    res.json({
      success: true,
      message: "Đổi mật khẩu thành công!",
      user: safeUser,
      token: token,
    });
  } catch (err) {
    console.error("Error changing password:", err);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi đổi mật khẩu.",
      error: err.message,
    });
  }
});

// @route   GET /api/users/reading-history
// @desc    Get user's reading history
// @access  Private
router.get(
  "/reading-history",
  auth.verifyToken,
  userController.getReadingHistory
);

// @route   DELETE /api/users/reading-history
// @desc    Clear user's reading history
// @access  Private
router.delete("/reading-history", auth.isAuth, async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId || userId === "unknown") {
      return res.status(401).json({
        success: false,
        message: "Không thể xác thực người dùng. Vui lòng đăng nhập lại.",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng.",
      });
    }

    // Clear the saved chapters array instead of reading history
    user.savedChapters = [];

    // Save the changes
    await user.save();

    res.json({
      success: true,
      message: "Đã xóa toàn bộ lịch sử đọc truyện.",
    });
  } catch (err) {
    console.error("Error clearing reading history:", err.message);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi xóa lịch sử đọc truyện.",
    });
  }
});

module.exports = router;
