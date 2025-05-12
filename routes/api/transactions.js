const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const auth = require("../../middleware/auth");
const adminAuth = require("../../middleware/adminAuth");
const Transaction = require("../../models/Transaction");
const User = require("../../models/User");

// @route   GET api/transactions/history
// @desc    Get transaction history for logged-in user
// @access  Private
router.get("/history", auth.verifyToken, async (req, res) => {
  try {
    const userId = req.userId || (req.user && req.user.id);
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Không xác định được người dùng" });
    }
    // Build filter
    const filter = { user: userId };
    if (req.query.type && req.query.type !== "all") {
      // Map frontend type to backend type if cần
      let type = req.query.type;
      if (type === "Mua chương" || type === "purchase") type = "purchase";
      if (type === "Nạp xu" || type === "deposit") type = "deposit";
      if (type === "Thưởng" || type === "reward") type = "reward";
      filter.type = type;
    }
    if (req.query.fromDate || req.query.toDate) {
      filter.createdAt = {};
      if (req.query.fromDate) {
        filter.createdAt.$gte = new Date(req.query.fromDate);
      }
      if (req.query.toDate) {
        // Set toDate to end of day
        const endDate = new Date(req.query.toDate);
        endDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDate;
      }
    }
    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, transactions });
  } catch (err) {
    console.error("Error fetching user transaction history:", err.message);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi tải lịch sử giao dịch",
    });
  }
});

// @route   GET api/transactions/admin/list
// @desc    Get all transactions for admin
// @access  Admin
router.get("/admin/list", async (req, res) => {
  try {
    // TẠMTHỜI: Bỏ qua kiểm tra admin trong giai đoạn phát triển
    // Trong môi trường production, cần bật lại middleware adminAuth

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    let filter = {};

    // Filter by type if provided
    if (req.query.type && req.query.type !== "all") {
      filter.type = req.query.type;
    }

    // Filter by status if provided
    if (req.query.status && req.query.status !== "all") {
      filter.status = req.query.status;
    }

    // Filter by search term if provided (user ID or username)
    if (req.query.search) {
      // Try to find users matching the search term by username or userId
      const users = await User.find({
        $or: [
          { username: { $regex: req.query.search, $options: "i" } },
          { userId: { $regex: req.query.search, $options: "i" } },
        ],
      }).select("_id");

      const userIds = users.map((user) => user._id);

      filter.$or = [
        {
          _id:
            req.query.search.length === 24
              ? mongoose.Types.ObjectId(req.query.search)
              : null,
        },
        { user: { $in: userIds } },
      ];
    }

    // Filter by date range if provided
    if (req.query.dateFrom || req.query.dateTo) {
      filter.createdAt = {};

      if (req.query.dateFrom) {
        filter.createdAt.$gte = new Date(req.query.dateFrom);
      }

      if (req.query.dateTo) {
        // Add one day to include the end date
        const endDate = new Date(req.query.dateTo);
        endDate.setDate(endDate.getDate() + 1);
        filter.createdAt.$lte = endDate;
      }
    }

    // Count total transactions
    const total = await Transaction.countDocuments(filter);

    // Get transactions
    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "userId username")
      .lean();

    res.json({
      transactions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error fetching transactions:", err.message);
    res.status(500).json({ msg: "Lỗi server khi tải danh sách giao dịch" });
  }
});

// @route   GET api/transactions/:id
// @desc    Get transaction by ID
// @access  Admin
router.get("/:id", async (req, res) => {
  try {
    // TẠMTHỜI: Bỏ qua kiểm tra admin trong giai đoạn phát triển
    // Trong môi trường production, cần bật lại middleware adminAuth

    const transaction = await Transaction.findById(req.params.id)
      .populate("user", "userId username")
      .lean();

    if (!transaction) {
      return res.status(404).json({ msg: "Không tìm thấy giao dịch" });
    }

    res.json(transaction);
  } catch (err) {
    console.error("Error fetching transaction:", err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Không tìm thấy giao dịch" });
    }
    res.status(500).json({ msg: "Lỗi server khi tải chi tiết giao dịch" });
  }
});

// @route   PUT api/transactions/approve/:id
// @desc    Approve a pending transaction
// @access  Admin
router.put("/approve/:id", async (req, res) => {
  try {
    // TẠMTHỜI: Bỏ qua kiểm tra admin trong giai đoạn phát triển
    // Trong môi trường production, cần bật lại middleware adminAuth

    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ msg: "Không tìm thấy giao dịch" });
    }

    if (transaction.status !== "pending") {
      return res
        .status(400)
        .json({ msg: "Chỉ có thể phê duyệt giao dịch đang chờ xử lý" });
    }

    // If this is a purchase, add coins to user
    if (transaction.type === "purchase") {
      const user = await User.findById(transaction.user);

      if (!user) {
        return res.status(404).json({ msg: "Không tìm thấy người dùng" });
      }

      // Add coins to user
      user.coins += transaction.coins;
      await user.save();
    }

    // Update transaction status
    transaction.status = "completed";
    transaction.completedAt = Date.now();
    await transaction.save();

    res.json(transaction);
  } catch (err) {
    console.error("Error approving transaction:", err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Không tìm thấy giao dịch" });
    }
    res.status(500).json({ msg: "Lỗi server khi phê duyệt giao dịch" });
  }
});

// @route   PUT api/transactions/cancel/:id
// @desc    Cancel a pending transaction
// @access  Admin
router.put("/cancel/:id", async (req, res) => {
  try {
    // TẠMTHỜI: Bỏ qua kiểm tra admin trong giai đoạn phát triển
    // Trong môi trường production, cần bật lại middleware adminAuth

    const { reason } = req.body;

    if (!reason) {
      return res
        .status(400)
        .json({ msg: "Vui lòng cung cấp lý do hủy giao dịch" });
    }

    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ msg: "Không tìm thấy giao dịch" });
    }

    if (transaction.status !== "pending") {
      return res
        .status(400)
        .json({ msg: "Chỉ có thể hủy giao dịch đang chờ xử lý" });
    }

    // Update transaction status
    transaction.status = "cancelled";
    transaction.cancelReason = reason;
    transaction.cancelledAt = Date.now();
    await transaction.save();

    res.json(transaction);
  } catch (err) {
    console.error("Error cancelling transaction:", err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Không tìm thấy giao dịch" });
    }
    res.status(500).json({ msg: "Lỗi server khi hủy giao dịch" });
  }
});

// @route   GET api/transactions/stats/summary
// @desc    Get transaction statistics
// @access  Admin
router.get("/stats/summary", async (req, res) => {
  try {
    // TẠMTHỜI: Bỏ qua kiểm tra admin trong giai đoạn phát triển
    // Trong môi trường production, cần bật lại middleware adminAuth

    // Get date range (default to last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    // Count total transactions
    const totalTransactions = await Transaction.countDocuments();

    // Count completed purchase transactions
    const completedPurchases = await Transaction.countDocuments({
      type: "purchase",
      status: "completed",
    });

    // Calculate total coins sold
    const coinsSoldResult = await Transaction.aggregate([
      {
        $match: {
          type: "purchase",
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          totalCoins: { $sum: "$coins" },
          totalAmount: { $sum: "$payment.amount" },
        },
      },
    ]);

    const totalCoinsSold =
      coinsSoldResult.length > 0 ? coinsSoldResult[0].totalCoins : 0;
    const totalRevenue =
      coinsSoldResult.length > 0 ? coinsSoldResult[0].totalAmount : 0;

    // Get transactions by day for the last 30 days
    const dailyTransactions = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: "completed",
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
          coins: { $sum: "$coins" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Get transactions by type
    const transactionsByType = await Transaction.aggregate([
      {
        $match: {
          status: "completed",
        },
      },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          coins: { $sum: "$coins" },
        },
      },
    ]);

    res.json({
      summary: {
        totalTransactions,
        completedPurchases,
        totalCoinsSold,
        totalRevenue,
      },
      daily: dailyTransactions,
      byType: transactionsByType,
    });
  } catch (err) {
    console.error("Error fetching transaction stats:", err.message);
    res.status(500).json({ msg: "Lỗi server khi tải thống kê giao dịch" });
  }
});

// @route   GET api/transactions/export
// @desc    Export transactions to CSV
// @access  Admin
router.get("/export", async (req, res) => {
  try {
    // TẠMTHỜI: Bỏ qua kiểm tra admin trong giai đoạn phát triển
    // Trong môi trường production, cần bật lại middleware adminAuth

    // Build filter object
    let filter = {};

    // Filter by type if provided
    if (req.query.type && req.query.type !== "all") {
      filter.type = req.query.type;
    }

    // Filter by status if provided
    if (req.query.status && req.query.status !== "all") {
      filter.status = req.query.status;
    }

    // Filter by search term if provided (user ID or username)
    if (req.query.search) {
      // Try to find users matching the search term
      const users = await User.find({
        username: { $regex: req.query.search, $options: "i" },
      }).select("_id");

      const userIds = users.map((user) => user._id);

      filter.$or = [
        {
          _id:
            req.query.search.length === 24
              ? mongoose.Types.ObjectId(req.query.search)
              : null,
        },
        { user: { $in: userIds } },
      ];
    }

    // Filter by date range if provided
    if (req.query.dateFrom || req.query.dateTo) {
      filter.createdAt = {};

      if (req.query.dateFrom) {
        filter.createdAt.$gte = new Date(req.query.dateFrom);
      }

      if (req.query.dateTo) {
        // Add one day to include the end date
        const endDate = new Date(req.query.dateTo);
        endDate.setDate(endDate.getDate() + 1);
        filter.createdAt.$lte = endDate;
      }
    }

    // Get transactions (no pagination limits for export)
    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .populate("user", "userId username")
      .lean();

    // Format the date for the filename
    const now = new Date();
    const filename = `transactions-export-${
      now.toISOString().split("T")[0]
    }.csv`;

    // Set headers for CSV download
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // Add UTF-8 BOM for correct encoding in Excel
    res.write("\ufeff");

    // Create and write CSV header
    const csvHeader =
      [
        "ID",
        "Người dùng",
        "Loại giao dịch",
        "Xu",
        "Trạng thái",
        "Nội dung",
        "Phương thức thanh toán",
        "Mã giao dịch",
        "Số tiền",
        "Lý do thưởng",
        "Ghi chú thưởng",
        "Đối tượng sử dụng",
        "Nội dung sử dụng",
        "Thời gian tạo",
        "Thời gian cập nhật",
      ].join(";") + "\n";

    res.write(csvHeader);

    // Create and write data rows
    transactions.forEach((tx) => {
      // Format transaction type
      let txType = "";
      switch (tx.type) {
        case "purchase":
          txType = "Nạp tiền";
          break;
        case "usage":
          txType = "Sử dụng";
          break;
        case "reward":
          txType = "Thưởng";
          break;
        default:
          txType = tx.type;
      }

      // Format status
      let status = "";
      switch (tx.status) {
        case "pending":
          status = "Chờ xử lý";
          break;
        case "completed":
          status = "Hoàn thành";
          break;
        case "cancelled":
          status = "Đã hủy";
          break;
        case "failed":
          status = "Thất bại";
          break;
        default:
          status = tx.status;
      }

      // Format dates
      const createdAt = new Date(tx.createdAt).toLocaleString("vi-VN");
      const updatedAt = new Date(tx.updatedAt).toLocaleString("vi-VN");

      // Build content based on transaction type
      let content = "";
      if (tx.type === "purchase") {
        content = `Nạp ${tx.coins} xu`;
      } else if (tx.type === "usage") {
        content = tx.use?.info || `Sử dụng ${tx.coins} xu`;
      } else if (tx.type === "reward") {
        content = `Thưởng ${tx.coins} xu`;
      }

      // Escape fields that might contain commas or quotes
      const escapeField = (field) => {
        if (field === null || field === undefined) return "";
        return String(field).replace(/"/g, '""');
      };

      // Build CSV row
      const row =
        [
          escapeField(tx._id),
          escapeField(tx.user?.username || tx.user),
          escapeField(txType),
          escapeField(tx.coins),
          escapeField(status),
          escapeField(content),
          escapeField(tx.payment?.method || ""),
          escapeField(tx.payment?.transactionId || ""),
          escapeField(tx.payment?.amount || ""),
          escapeField(tx.reward?.reason || ""),
          escapeField(tx.reward?.note || ""),
          escapeField(tx.use?.target || ""),
          escapeField(tx.use?.info || ""),
          escapeField(createdAt),
          escapeField(updatedAt),
        ].join(";") + "\n";

      res.write(row);
    });

    res.end();
  } catch (err) {
    console.error("Error exporting transactions:", err.message);
    res.status(500).json({ msg: "Lỗi server khi xuất dữ liệu giao dịch" });
  }
});

// @route   GET api/transactions
// @desc    Get transactions with pagination and filters
// @access  Admin (currently no auth for testing)
router.get("/", async (req, res) => {
  try {
    // TẠMTHỜI: Bỏ qua kiểm tra admin trong giai đoạn phát triển
    // Trong môi trường production, cần bật lại middleware adminAuth

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    let filter = {};

    // Filter by type if provided
    if (req.query.type && req.query.type !== "all") {
      filter.type = req.query.type;
    }

    // Filter by status if provided
    if (req.query.status && req.query.status !== "all") {
      filter.status = req.query.status;
    }

    // Filter by search term if provided (user ID or username)
    if (req.query.search) {
      // Try to find users matching the search term by username or userId
      const users = await User.find({
        $or: [
          { username: { $regex: req.query.search, $options: "i" } },
          { userId: { $regex: req.query.search, $options: "i" } },
        ],
      }).select("_id");

      const userIds = users.map((user) => user._id);

      filter.$or = [
        {
          _id:
            req.query.search.length === 24
              ? mongoose.Types.ObjectId(req.query.search)
              : null,
        },
        { user: { $in: userIds } },
      ];
    }

    // Filter by date range if provided
    if (req.query.dateFrom || req.query.dateTo) {
      filter.createdAt = {};

      if (req.query.dateFrom) {
        filter.createdAt.$gte = new Date(req.query.dateFrom);
      }

      if (req.query.dateTo) {
        // Add one day to include the end date
        const endDate = new Date(req.query.dateTo);
        endDate.setDate(endDate.getDate() + 1);
        filter.createdAt.$lte = endDate;
      }
    }

    // Count total transactions
    const total = await Transaction.countDocuments(filter);

    // Get transactions
    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "userId username")
      .lean();

    res.json({
      transactions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error fetching transactions:", err.message);
    res.status(500).json({ msg: "Lỗi server khi tải danh sách giao dịch" });
  }
});

// @route   POST api/transactions/purchase
// @desc    Mua chapter (trừ xu)
// @access  Private
router.post("/purchase", auth.verifyToken, async (req, res) => {
  try {
    const { itemId, itemType, amount, description } = req.body;
    const userId = req.userId || (req.user && req.user.id);

    // Validate required fields
    if (!itemId || !itemType || !amount || !description) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin giao dịch mua chương.",
      });
    }

    // Check if user has enough coins
    const user = await User.findById(userId);
    if (!user || user.coins < amount) {
      return res.status(400).json({
        success: false,
        message: "Số xu không đủ để thực hiện giao dịch.",
      });
    }

    // Create transaction
    const transaction = new Transaction({
      user: userId,
      type: "purchase",
      coins: amount,
      description,
      use: {
        target: itemType,
        targetId: itemId,
        info: description,
      },
      status: "completed",
      completedAt: Date.now(),
    });
    await transaction.save();

    // Trừ xu của user
    user.coins -= amount;
    await user.save();

    res.json({
      success: true,
      message: "Giao dịch mua chương thành công.",
      transaction,
    });
  } catch (err) {
    console.error("Error processing purchase transaction:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi mua chương.",
    });
  }
});

// @route   POST /api/transactions/deposit
// @desc    User gửi yêu cầu nạp xu chuyển khoản ngân hàng
// @access  Private
router.post("/deposit", auth.verifyToken, async (req, res) => {
  try {
    const { packageId, paymentMethod, amount, coins } = req.body;
    if (!packageId || !paymentMethod || !amount || !coins) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu thông tin nạp xu" });
    }
    // Tạo transaction ở trạng thái completed (auto duyệt)
    const transaction = new Transaction({
      user: req.userId || (req.user && req.user.id),
      type: "deposit",
      coins,
      description: `Nạp ${coins} xu qua chuyển khoản ngân hàng`,
      payment: {
        method: paymentMethod,
        amount,
        packageId,
      },
      status: "completed",
      completedAt: Date.now(),
    });
    await transaction.save();
    // Cộng xu cho user ngay sau khi nạp thành công
    await User.findByIdAndUpdate(req.userId || (req.user && req.user.id), {
      $inc: { coins: coins },
    });
    res.json({
      success: true,
      message: "Nạp xu thành công (auto duyệt)",
      transaction,
    });
  } catch (err) {
    console.error("Error creating deposit transaction:", err);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server khi tạo giao dịch nạp xu" });
  }
});

// @route   DELETE api/transactions/:id
// @desc    Xóa transaction, nếu là deposit đã completed thì trừ xu khỏi user
// @access  Admin
router.delete("/:id", async (req, res) => {
  try {
    const forceDelete = req.query.force === "true";
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy giao dịch" });
    }
    // Nếu là nạp xu và đã completed thì kiểm tra số dư trước khi xóa
    if (
      transaction.type === "deposit" &&
      transaction.status === "completed" &&
      !forceDelete
    ) {
      const user = await User.findById(transaction.user);
      if (user) {
        // Tính tổng xu nạp (trừ đi giao dịch này)
        const totalDeposit = await Transaction.aggregate([
          {
            $match: {
              user: user._id,
              type: "deposit",
              status: "completed",
              _id: { $ne: transaction._id },
            },
          },
          { $group: { _id: null, sum: { $sum: "$coins" } } },
        ]);
        // Tính tổng xu đã mua
        const totalPurchase = await Transaction.aggregate([
          { $match: { user: user._id, type: "usage", status: "completed" } },
          { $group: { _id: null, sum: { $sum: "$coins" } } },
        ]);
        const deposit = totalDeposit[0]?.sum || 0;
        const purchase = totalPurchase[0]?.sum || 0;
        if (deposit < purchase) {
          return res.status(400).json({
            success: false,
            message:
              "Không thể xóa giao dịch nạp xu này vì người dùng đã sử dụng số xu này cho các giao dịch khác.",
            canForce: true,
          });
        }
      }
    }
    // Nếu là mua chương và đã completed thì cộng lại xu cho user
    if (transaction.type === "purchase" && transaction.status === "completed") {
      const user = await User.findById(transaction.user);
      if (user) {
        user.coins = (user.coins || 0) + (transaction.coins || 0);
        await user.save();
      }
    }
    await transaction.deleteOne();

    // Sau khi xóa, đồng bộ lại số xu cho user
    const user = await User.findById(transaction.user);
    if (user) {
      // Tính tổng xu nạp
      const totalDeposit = await Transaction.aggregate([
        { $match: { user: user._id, type: "deposit", status: "completed" } },
        { $group: { _id: null, sum: { $sum: "$coins" } } },
      ]);
      // Tính tổng xu đã mua
      const totalPurchase = await Transaction.aggregate([
        { $match: { user: user._id, type: "usage", status: "completed" } },
        { $group: { _id: null, sum: { $sum: "$coins" } } },
      ]);
      const deposit = totalDeposit[0]?.sum || 0;
      const purchase = totalPurchase[0]?.sum || 0;
      user.coins = deposit - purchase;
      await user.save();
    }

    res.json({ success: true, message: "Đã xóa giao dịch thành công!" });
  } catch (err) {
    console.error("Error deleting transaction:", err);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server khi xóa giao dịch" });
  }
});

module.exports = router;
