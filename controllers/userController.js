const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Story = require("../models/Story");

// Get user profile for API
exports.getProfile = async (req, res) => {
  try {
    // Lấy thông tin người dùng từ middleware auth
    const userId = req.userId;
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin người dùng.",
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi tải thông tin tài khoản.",
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { email, displayName, avatar } = req.body;

    // Create update object
    const updateData = {};

    // Validate and add email if provided
    if (email) {
      // You can add email validation here
      updateData.email = email;
    }

    // Add display name if provided
    if (displayName) {
      updateData.displayName = displayName;
    }

    // Add avatar if provided
    if (avatar) {
      // In a real-world app, you would:
      // 1. Validate the base64 string
      // 2. Possibly compress the image
      // 3. Store in a cloud service like AWS S3
      // Here we'll store it directly in the user document
      updateData.avatar = avatar;
    }

    // Update user in database
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      select: "-password",
    });

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin người dùng.",
      });
    }

    res.json({
      success: true,
      message: "Cập nhật thông tin thành công!",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi cập nhật thông tin tài khoản.",
    });
  }
};

// Upload avatar
exports.uploadAvatar = async (req, res) => {
  try {
    const userId = req.userId;
    const { avatar } = req.body;

    if (!avatar) {
      return res.status(400).json({
        success: false,
        message: "Không tìm thấy ảnh đại diện để tải lên.",
      });
    }

    // Update user's avatar
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { avatar },
      { new: true, select: "-password" }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin người dùng.",
      });
    }

    res.json({
      success: true,
      message: "Cập nhật ảnh đại diện thành công!",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error uploading avatar:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi tải lên ảnh đại diện.",
    });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const userId = req.userId;
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp mật khẩu hiện tại và mật khẩu mới.",
      });
    }

    // Find user
    const user = await User.findById(userId);
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

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: "Đổi mật khẩu thành công!",
    });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi đổi mật khẩu.",
    });
  }
};

// Get user's followed stories
exports.getFollowedStories = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.userId) {
      return res.redirect("/auth/login");
    }

    const user = await User.findById(req.session.userId).populate({
      path: "followedStories",
      populate: {
        path: "genres",
      },
    });

    if (!user) {
      req.session.destroy();
      return res.redirect("/auth/login");
    }

    res.render("users/followed-stories", {
      title: "Truyện đang theo dõi",
      followedStories: user.followedStories,
    });
  } catch (error) {
    console.error("Error fetching followed stories:", error);
    res.status(500).render("error", {
      title: "Lỗi",
      message: "Đã xảy ra lỗi khi tải danh sách truyện theo dõi.",
    });
  }
};

// Get user's coin transactions
exports.getTransactions = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.userId) {
      return res.redirect("/auth/login");
    }

    const transactions = await Transaction.find({
      user: req.session.userId,
    }).sort({ createdAt: -1 });

    const user = await User.findById(req.session.userId);

    res.render("users/transactions", {
      title: "Lịch sử giao dịch",
      transactions,
      user,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).render("error", {
      title: "Lỗi",
      message: "Đã xảy ra lỗi khi tải lịch sử giao dịch.",
    });
  }
};

// Get coin packages page
exports.getCoinPackages = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.userId) {
      return res.redirect("/auth/login?redirect=/users/coins");
    }

    const user = await User.findById(req.session.userId);

    // Coin packages
    const coinPackages = [
      { id: "coin_100", amount: 20000, coins: 100 },
      { id: "coin_300", amount: 50000, coins: 300 },
      { id: "coin_500", amount: 80000, coins: 500 },
      { id: "coin_1000", amount: 150000, coins: 1000 },
      { id: "coin_2000", amount: 280000, coins: 2000 },
      { id: "coin_5000", amount: 650000, coins: 5000 },
    ];

    res.render("users/coins", {
      title: "Nạp xu",
      user,
      coinPackages,
    });
  } catch (error) {
    console.error("Error loading coin packages:", error);
    res.status(500).render("error", {
      title: "Lỗi",
      message: "Đã xảy ra lỗi khi tải trang nạp xu.",
    });
  }
};

// Process coin purchase
exports.purchaseCoins = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: "Vui lòng đăng nhập để nạp xu.",
      });
    }

    const { packageId, paymentMethod } = req.body;

    // Validate package
    const coinPackages = {
      coin_100: { amount: 20000, coins: 100 },
      coin_300: { amount: 50000, coins: 300 },
      coin_500: { amount: 80000, coins: 500 },
      coin_1000: { amount: 150000, coins: 1000 },
      coin_2000: { amount: 280000, coins: 2000 },
      coin_5000: { amount: 650000, coins: 5000 },
    };

    const selectedPackage = coinPackages[packageId];
    if (!selectedPackage) {
      return res.status(400).json({
        success: false,
        message: "Gói xu không hợp lệ.",
      });
    }

    // Validate payment method
    const validPaymentMethods = ["credit_card", "paypal", "bank_transfer"];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Phương thức thanh toán không hợp lệ.",
      });
    }

    // Create transaction (in real app, you would connect to payment gateway)
    const transaction = new Transaction({
      user: req.session.userId,
      type: "purchase",
      amount: selectedPackage.amount,
      coins: selectedPackage.coins,
      description: `Nạp ${selectedPackage.coins} xu`,
      status: "completed",
      paymentMethod,
    });

    await transaction.save();

    // Update user coins
    await User.findByIdAndUpdate(req.session.userId, {
      $inc: { coins: selectedPackage.coins },
    });

    res.json({
      success: true,
      message: "Nạp xu thành công!",
      coins: selectedPackage.coins,
    });
  } catch (error) {
    console.error("Error purchasing coins:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi nạp xu.",
    });
  }
};

// @desc    Get user's SAVED chapters ( repurposed from reading history)
// @route   GET /api/users/reading-history
// @access  Private
exports.getReadingHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("savedChapters") // Select ONLY savedChapters
      .populate({
        path: "savedChapters.story", // Populate saved stories
        select: "title author cover",
      })
      .populate({
        path: "savedChapters.chapter", // Populate saved chapters
        select: "title number", // Select fields for the chapter
      })
      .lean(); // Use lean for performance

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin người dùng",
      });
    }

    // Ensure we always return an array, even if empty
    const savedChapters = user.savedChapters || [];

    // Sort by savedAt in descending order (newest first)
    savedChapters.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

    res.json({
      success: true,
      history: savedChapters, // Return saved chapters under the 'history' key for frontend compatibility
    });
  } catch (error) {
    console.error("Error fetching saved chapters:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi tải danh sách chương đã lưu",
    });
  }
};

// @desc    Clear user's reading history
// @route   DELETE /api/users/reading-history
// @access  Private
exports.clearReadingHistory = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      $set: { readingHistory: [] },
    });

    res.json({
      success: true,
      message: "Đã xóa lịch sử đọc truyện",
    });
  } catch (error) {
    console.error("Error clearing reading history:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi xóa lịch sử đọc truyện",
    });
  }
};
