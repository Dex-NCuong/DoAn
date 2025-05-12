const User = require("../models/User");
const Story = require("../models/Story");
const Chapter = require("../models/Chapter");
const Genre = require("../models/Genre");
const Transaction = require("../models/Transaction");

// Middleware to check admin role
exports.isAdmin = (req, res, next) => {
  if (!req.session.userId || req.session.userRole !== "admin") {
    return res.status(403).render("error", {
      title: "Truy cập bị từ chối",
      message: "Bạn không có quyền truy cập vào trang này.",
    });
  }
  next();
};

// Admin dashboard
exports.getDashboard = async (req, res) => {
  try {
    // Get counts
    const userCount = await User.countDocuments();
    const storyCount = await Story.countDocuments();
    const chapterCount = await Chapter.countDocuments();
    const pendingChapters = await Chapter.countDocuments({ status: "pending" });

    // Get recent transactions
    const recentTransactions = await Transaction.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("user", "username");

    // Calculate total coin purchases
    const totalCoins = await Transaction.aggregate([
      { $match: { type: "purchase", status: "completed" } },
      { $group: { _id: null, total: { $sum: "$coins" } } },
    ]);

    // Calculate total coin usage
    const totalUsage = await Transaction.aggregate([
      { $match: { type: "usage", status: "completed" } },
      { $group: { _id: null, total: { $sum: "$coins" } } },
    ]);

    res.render("admin/dashboard", {
      title: "Bảng điều khiển Admin",
      userCount,
      storyCount,
      chapterCount,
      pendingChapters,
      recentTransactions,
      totalCoins: totalCoins.length > 0 ? totalCoins[0].total : 0,
      totalUsage: totalUsage.length > 0 ? totalUsage[0].total : 0,
    });
  } catch (error) {
    console.error("Error loading admin dashboard:", error);
    res.status(500).render("error", {
      title: "Lỗi",
      message: "Đã xảy ra lỗi khi tải bảng điều khiển.",
    });
  }
};

// Stories management
exports.getStories = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;

    // Build query
    const query = {};
    if (search) {
      query.$text = { $search: search };
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get stories
    const stories = await Story.find(query)
      .populate("genres", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalStories = await Story.countDocuments(query);
    const totalPages = Math.ceil(totalStories / parseInt(limit));

    res.render("admin/stories", {
      title: "Quản lý truyện",
      stories,
      currentPage: parseInt(page),
      totalPages,
      totalStories,
      search,
    });
  } catch (error) {
    console.error("Error loading stories admin page:", error);
    res.status(500).render("error", {
      title: "Lỗi",
      message: "Đã xảy ra lỗi khi tải danh sách truyện.",
    });
  }
};

// Story edit page
exports.getEditStory = async (req, res) => {
  try {
    const { id } = req.params;

    const story = await Story.findById(id).populate("genres");

    if (!story) {
      return res.status(404).render("error", {
        title: "Không tìm thấy",
        message: "Truyện không tồn tại hoặc đã bị xóa.",
      });
    }

    // Get all genres for selection
    const genres = await Genre.find().sort({ name: 1 });

    res.render("admin/edit-story", {
      title: `Chỉnh sửa truyện: ${story.title}`,
      story,
      genres,
    });
  } catch (error) {
    console.error("Error loading story edit page:", error);
    res.status(500).render("error", {
      title: "Lỗi",
      message: "Đã xảy ra lỗi khi tải trang chỉnh sửa truyện.",
    });
  }
};

// Update story
exports.updateStory = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, author, description, status, genres, isHot, isNew } =
      req.body;

    // Update story
    await Story.findByIdAndUpdate(id, {
      title,
      author,
      description,
      status,
      genres: Array.isArray(genres) ? genres : [genres],
      isHot: !!isHot,
      isNew: !!isNew,
      updatedAt: Date.now(),
    });

    res.redirect("/admin/stories");
  } catch (error) {
    console.error("Error updating story:", error);
    res.status(500).render("error", {
      title: "Lỗi",
      message: "Đã xảy ra lỗi khi cập nhật truyện.",
    });
  }
};

// Delete story
exports.deleteStory = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete story and all related chapters
    await Story.findByIdAndDelete(id);
    await Chapter.deleteMany({ story: id });

    res.redirect("/admin/stories");
  } catch (error) {
    console.error("Error deleting story:", error);
    res.status(500).render("error", {
      title: "Lỗi",
      message: "Đã xảy ra lỗi khi xóa truyện.",
    });
  }
};

// Chapters management
exports.getChapters = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = "", storyId = "" } = req.query;

    // Build query
    const query = {};
    if (status) {
      query.status = status;
    }
    if (storyId) {
      query.story = storyId;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get chapters
    const chapters = await Chapter.find(query)
      .populate("story", "title")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalChapters = await Chapter.countDocuments(query);
    const totalPages = Math.ceil(totalChapters / parseInt(limit));

    // Get all stories for filter
    const stories = await Story.find().sort({ title: 1 }).select("title");

    res.render("admin/chapters", {
      title: "Quản lý chương truyện",
      chapters,
      currentPage: parseInt(page),
      totalPages,
      totalChapters,
      stories,
      filters: {
        status,
        storyId,
      },
    });
  } catch (error) {
    console.error("Error loading chapters admin page:", error);
    res.status(500).render("error", {
      title: "Lỗi",
      message: "Đã xảy ra lỗi khi tải danh sách chương truyện.",
    });
  }
};

// Chapter edit page
exports.getEditChapter = async (req, res) => {
  try {
    const { id } = req.params;

    const chapter = await Chapter.findById(id).populate("story", "title");

    if (!chapter) {
      return res.status(404).render("error", {
        title: "Không tìm thấy",
        message: "Chương truyện không tồn tại hoặc đã bị xóa.",
      });
    }

    res.render("admin/edit-chapter", {
      title: `Chỉnh sửa chương: ${chapter.title}`,
      chapter,
    });
  } catch (error) {
    console.error("Error loading chapter edit page:", error);
    res.status(500).render("error", {
      title: "Lỗi",
      message: "Đã xảy ra lỗi khi tải trang chỉnh sửa chương truyện.",
    });
  }
};

// Update chapter
exports.updateChapter = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, status, isFree, coinPrice } = req.body;

    // Update chapter
    await Chapter.findByIdAndUpdate(id, {
      title,
      content,
      status,
      isFree: !!isFree,
      coinPrice: isFree ? 0 : parseInt(coinPrice),
      updatedAt: Date.now(),
    });

    res.redirect("/admin/chapters");
  } catch (error) {
    console.error("Error updating chapter:", error);
    res.status(500).render("error", {
      title: "Lỗi",
      message: "Đã xảy ra lỗi khi cập nhật chương truyện.",
    });
  }
};

// Approve chapter
exports.approveChapter = async (req, res) => {
  try {
    const { id } = req.params;

    // Update chapter status
    await Chapter.findByIdAndUpdate(id, {
      status: "published",
      updatedAt: Date.now(),
    });

    // Increment chapter count for the story
    const chapter = await Chapter.findById(id);
    await Story.findByIdAndUpdate(chapter.story, {
      $inc: { chapterCount: 1 },
    });

    res.redirect("/admin/chapters?status=pending");
  } catch (error) {
    console.error("Error approving chapter:", error);
    res.status(500).render("error", {
      title: "Lỗi",
      message: "Đã xảy ra lỗi khi phê duyệt chương truyện.",
    });
  }
};

// Reject chapter
exports.rejectChapter = async (req, res) => {
  try {
    const { id } = req.params;

    // Update chapter status
    await Chapter.findByIdAndUpdate(id, {
      status: "rejected",
      updatedAt: Date.now(),
    });

    res.redirect("/admin/chapters?status=pending");
  } catch (error) {
    console.error("Error rejecting chapter:", error);
    res.status(500).render("error", {
      title: "Lỗi",
      message: "Đã xảy ra lỗi khi từ chối chương truyện.",
    });
  }
};

// Users management
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;

    // Build query
    const query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get users
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalUsers = await User.countDocuments(query);
    const totalPages = Math.ceil(totalUsers / parseInt(limit));

    res.render("admin/users", {
      title: "Quản lý người dùng",
      users,
      currentPage: parseInt(page),
      totalPages,
      totalUsers,
      search,
    });
  } catch (error) {
    console.error("Error loading users admin page:", error);
    res.status(500).render("error", {
      title: "Lỗi",
      message: "Đã xảy ra lỗi khi tải danh sách người dùng.",
    });
  }
};

// Transactions management
exports.getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, type = "", status = "" } = req.query;

    // Build query
    const query = {};
    if (type) {
      query.type = type;
    }
    if (status) {
      query.status = status;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get transactions
    const transactions = await Transaction.find(query)
      .populate("user", "username")
      .populate("chapter")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalTransactions = await Transaction.countDocuments(query);
    const totalPages = Math.ceil(totalTransactions / parseInt(limit));

    res.render("admin/transactions", {
      title: "Quản lý giao dịch",
      transactions,
      currentPage: parseInt(page),
      totalPages,
      totalTransactions,
      filters: {
        type,
        status,
      },
    });
  } catch (error) {
    console.error("Error loading transactions admin page:", error);
    res.status(500).render("error", {
      title: "Lỗi",
      message: "Đã xảy ra lỗi khi tải danh sách giao dịch.",
    });
  }
};

// API for dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    // Get counts
    const userCount = await User.countDocuments();
    const storyCount = await Story.countDocuments();
    const chapterCount = await Chapter.countDocuments();
    const pendingChapters = await Chapter.countDocuments({ status: "pending" });

    // Calculate total coin purchases
    const totalCoins = await Transaction.aggregate([
      { $match: { type: "purchase", status: "completed" } },
      { $group: { _id: null, total: { $sum: "$coins" } } },
    ]);

    // Calculate total coin usage
    const totalUsage = await Transaction.aggregate([
      { $match: { type: "usage", status: "completed" } },
      { $group: { _id: null, total: { $sum: "$coins" } } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        userCount,
        storyCount,
        chapterCount,
        pendingChapters,
        totalCoins: totalCoins.length > 0 ? totalCoins[0].total : 0,
        totalUsage: totalUsage.length > 0 ? totalUsage[0].total : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy thống kê tổng quan.",
    });
  }
};

// API for recent transactions
exports.getRecentTransactions = async (req, res) => {
  try {
    // Get recent transactions
    const recentTransactions = await Transaction.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("user", "userId username");

    res.status(200).json({
      success: true,
      data: recentTransactions,
    });
  } catch (error) {
    console.error("Error fetching recent transactions:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy giao dịch gần đây.",
    });
  }
};

// API for pending chapters
exports.getPendingChapters = async (req, res) => {
  try {
    const pendingChapters = await Chapter.find({ status: "pending" })
      .sort({ createdAt: -1 })
      .populate("story", "title")
      .limit(10);

    res.status(200).json({
      success: true,
      data: pendingChapters,
    });
  } catch (error) {
    console.error("Error fetching pending chapters:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy danh sách chương đang chờ duyệt.",
    });
  }
};

// API for coin sales stats
exports.getCoinSalesStats = async (req, res) => {
  try {
    const { year, period = "week" } = req.query;
    if (year) {
      // Thống kê xu đã nạp theo tháng của năm
      const start = new Date(`${year}-01-01T00:00:00.000Z`);
      const end = new Date(`${year}-12-31T23:59:59.999Z`);
      const coinsByMonth = await Transaction.aggregate([
        {
          $match: {
            type: "deposit",
            status: "completed",
            createdAt: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: { $month: "$createdAt" },
            totalCoins: { $sum: "$coins" },
          },
        },
        { $sort: { _id: 1 } },
      ]);
      // Tạo mảng 12 phần tử, mỗi phần tử là tổng xu đã nạp của tháng đó
      const result = Array(12).fill(0);
      coinsByMonth.forEach((item) => {
        result[item._id - 1] = item.totalCoins;
      });
      return res.status(200).json({ success: true, data: result });
    }
    // Get time range from query params or default to last 7 days
    let dateRange;

    // Calculate date range based on period
    const now = new Date();
    if (period === "week") {
      dateRange = new Date(now.setDate(now.getDate() - 7));
    } else if (period === "month") {
      dateRange = new Date(now.setMonth(now.getMonth() - 1));
    } else if (period === "year") {
      dateRange = new Date(now.setFullYear(now.getFullYear() - 1));
    }

    // Aggregate coin purchases by day
    const coinSalesData = await Transaction.aggregate([
      {
        $match: {
          type: "purchase",
          status: "completed",
          createdAt: { $gte: dateRange },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          totalCoins: { $sum: "$coins" },
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: coinSalesData,
    });
  } catch (error) {
    console.error("Error fetching coin sales stats:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy thống kê xu đã bán.",
    });
  }
};

// API for new users stats
exports.getNewUsersStats = async (req, res) => {
  try {
    const { year, period = "week" } = req.query;
    if (year) {
      // Thống kê theo tháng của năm
      const start = new Date(`${year}-01-01T00:00:00.000Z`);
      const end = new Date(`${year}-12-31T23:59:59.999Z`);
      const usersByMonth = await User.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: { $month: "$createdAt" },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);
      // Tạo mảng 12 phần tử, mỗi phần tử là số user mới của tháng đó
      const result = Array(12).fill(0);
      usersByMonth.forEach((item) => {
        result[item._id - 1] = item.count;
      });
      return res.status(200).json({ success: true, data: result });
    }
    // Get time range from query params hoặc default to last 7 days
    let dateRange;

    // Calculate date range based on period
    const now = new Date();
    if (period === "week") {
      dateRange = new Date(now.setDate(now.getDate() - 7));
    } else if (period === "month") {
      dateRange = new Date(now.setMonth(now.getMonth() - 1));
    } else if (period === "year") {
      dateRange = new Date(now.setFullYear(now.getFullYear() - 1));
    }

    // Aggregate new users by day
    const newUsersData = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: dateRange },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: newUsersData,
    });
  } catch (error) {
    console.error("Error fetching new users stats:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy thống kê người dùng mới.",
    });
  }
};

// Get all users (API)
exports.getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      role = "",
      status = "",
    } = req.query;

    // Build query
    const query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { userId: { $regex: search, $options: "i" } },
      ];
    }

    if (role && role !== "all") {
      query.role = role;
    }

    if (status) {
      if (status === "active" || status === "Đang hoạt động") {
        query.status = true;
      } else if (status === "banned" || status === "Bị cấm") {
        query.status = false;
      }
    }

    // Bổ sung lọc theo ngày tạo
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) {
        query.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        // Lấy hết ngày endDate
        const end = new Date(req.query.endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get users
    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalUsers = await User.countDocuments(query);
    const totalPages = Math.ceil(totalUsers / parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: totalUsers,
          pageSize: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Error getting users:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy danh sách người dùng.",
    });
  }
};

// Get user by ID (API)
exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng.",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Error getting user:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy thông tin người dùng.",
    });
  }
};

// Update user (API)
exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { email, displayName, role, coins, status } = req.body;

    // Validate email doesn't already exist for another user
    if (email) {
      const existingUser = await User.findOne({
        email,
        _id: { $ne: userId },
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email đã tồn tại cho người dùng khác.",
        });
      }
    }

    // Validate username doesn't already exist for another user
    if (req.body.username) {
      const existingUserByUsername = await User.findOne({
        username: req.body.username,
        _id: { $ne: userId },
      });
      if (existingUserByUsername) {
        return res.status(400).json({
          success: false,
          message: "Username đã tồn tại cho người dùng khác.",
        });
      }
    }

    // Update user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng.",
      });
    }
    if (email) user.email = email;
    if (displayName) user.displayName = displayName;
    if (role) user.role = role;
    if (coins !== undefined) user.coins = coins;
    if (status !== undefined) {
      if (status === "active" || status === "Đang hoạt động" || status === true)
        user.status = true;
      else if (status === "banned" || status === "Bị cấm" || status === false)
        user.status = false;
    }
    if (req.body.password && req.body.password.trim() !== "") {
      console.log("Before update - User password:", user.password);
      user.password = req.body.password;
      await user.save();
      console.log("After update - User password:", user.password);
    }
    if (req.body.username) user.username = req.body.username;
    await user.save();
    const userObj = user.toObject();
    delete userObj.password;
    res.status(200).json({
      success: true,
      message: "Cập nhật thông tin người dùng thành công.",
      data: userObj,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi cập nhật thông tin người dùng.",
    });
  }
};

// Toggle user status (active/inactive) (API)
exports.toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    // Update user status
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { status: status } },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng.",
      });
    }

    const statusText = status ? "kích hoạt" : "vô hiệu hóa";

    res.status(200).json({
      success: true,
      message: `Đã ${statusText} tài khoản người dùng.`,
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error toggling user status:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi thay đổi trạng thái người dùng.",
    });
  }
};

// Delete user (API)
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng.",
      });
    }

    // Delete user
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: "Xóa người dùng thành công.",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi xóa người dùng.",
    });
  }
};

async function generateUniqueUserId() {
  let userId;
  let exists = true;
  while (exists) {
    userId = Math.floor(1000000 + Math.random() * 9000000).toString();
    exists = await User.exists({ userId });
  }
  return userId;
}

// Create a new user (Admin function)
exports.createUser = async (req, res) => {
  try {
    const { username, email, password, displayName, role } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Username, email, and password are required",
      });
    }

    // Check if username already exists
    const existingUserByUsername = await User.findOne({ username });
    if (existingUserByUsername) {
      return res.status(400).json({
        success: false,
        message: "Username is already taken",
      });
    }

    // Check if email already exists
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      return res.status(400).json({
        success: false,
        message: "Email is already registered",
      });
    }

    // Create new user
    const userId = await generateUniqueUserId();
    let status = true;
    if (req.body.status === "active" || req.body.status === "Đang hoạt động")
      status = true;
    else if (req.body.status === "banned" || req.body.status === "Bị cấm")
      status = false;
    const newUser = new User({
      username,
      email,
      password, // Will be hashed by pre-save hook in the User model
      displayName: displayName || username,
      role: role || "user",
      status,
      coins: 0,
      userId,
    });

    // Save the user
    await newUser.save();

    // Return success response (without password)
    const userResponse = newUser.toObject();
    delete userResponse.password;
    userResponse.userId = newUser.userId;

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: userResponse,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Reset user password
exports.resetUserPassword = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Generate random password
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let newPassword = "";
    for (let i = 0; i < 8; i++) {
      newPassword += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }

    // Update user password
    user.password = newPassword; // Will be hashed by pre-save hook in the User model
    await user.save();

    // Return success response with new password
    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
      data: {
        newPassword,
      },
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
