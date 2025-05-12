const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const Transaction = require("../models/Transaction");
const User = require("../models/User");

// Get user's transaction history with optional filters
router.get("/history", auth.isAuth, async (req, res) => {
  try {
    const { type, fromDate, toDate } = req.query;
    const userId = req.userId;

    // Build query
    const query = { user: userId };

    // Apply type filter if provided
    if (type && type !== "all") {
      query.type = type;
    }

    // Apply date filter if provided
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) {
        query.createdAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        // Set toDate to end of day
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }

    // Find transactions
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      transactions,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi tải lịch sử giao dịch.",
    });
  }
});

// Create deposit transaction
router.post("/deposit", auth.isAuth, async (req, res) => {
  try {
    const { packageId, paymentMethod, amount, coins } = req.body;
    const userId = req.userId;

    // Validate required fields
    if (!packageId || !paymentMethod || !amount || !coins) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin giao dịch nạp xu.",
      });
    }

    // Create transaction
    const transaction = new Transaction({
      user: userId,
      type: "deposit",
      coins: coins,
      status: "completed",
      payment: {
        method: paymentMethod,
        amount: amount,
        packageId: packageId,
      },
    });

    await transaction.save();

    // Cộng xu ngay cho user
    await User.findByIdAndUpdate(userId, { $inc: { coins: coins } });

    res.json({
      success: true,
      transaction,
      message: "Giao dịch nạp xu đã được tạo.",
    });
  } catch (error) {
    console.error("Error creating deposit transaction:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi tạo giao dịch nạp xu.",
    });
  }
});

// Create purchase transaction
router.post("/purchase", auth.isAuth, async (req, res) => {
  try {
    const { itemId, itemType, amount, description } = req.body;
    const userId = req.userId;

    // Validate required fields
    if (!itemId || !itemType || !amount || !description) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin giao dịch mua hàng.",
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
      amount: amount,
      description,
      paymentMethod: "coin",
      status: "completed",
      metadata: {
        itemId,
        itemType,
      },
    });

    await transaction.save();

    // Update user's coin balance
    user.coins -= amount;
    await user.save();

    res.json({
      success: true,
      transaction,
      message: "Giao dịch mua hàng thành công.",
    });
  } catch (error) {
    console.error("Error creating purchase transaction:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi tạo giao dịch mua hàng.",
    });
  }
});

// Confirm transaction (for payment webhooks)
router.post("/confirm", async (req, res) => {
  try {
    const { transactionId, status, paymentDetails } = req.body;

    // Find the transaction
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy giao dịch.",
      });
    }

    // Only update pending transactions
    if (transaction.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Giao dịch này không thể được xác nhận.",
      });
    }

    // Update transaction status
    transaction.status = status;
    if (paymentDetails) {
      transaction.metadata.paymentDetails = paymentDetails;
    }
    await transaction.save();

    // If completed, update user's coin balance
    if (status === "completed" && transaction.type === "deposit") {
      await User.findByIdAndUpdate(transaction.user, {
        $inc: { coins: transaction.amount },
      });
    }

    res.json({
      success: true,
      message: "Đã cập nhật trạng thái giao dịch.",
      transaction,
    });
  } catch (error) {
    console.error("Error confirming transaction:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi xác nhận giao dịch.",
    });
  }
});

// Get transaction by ID
router.get("/:id", auth.isAuth, async (req, res) => {
  try {
    const transactionId = req.params.id;
    const userId = req.userId;

    const transaction = await Transaction.findOne({
      _id: transactionId,
      user: userId,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy giao dịch.",
      });
    }

    res.json({
      success: true,
      transaction,
    });
  } catch (error) {
    console.error("Error fetching transaction:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi tải thông tin giao dịch.",
    });
  }
});

// Test endpoint to create sample transactions (development only)
router.post("/test/create-samples", auth.isAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Create sample transactions
    const sampleTransactions = [
      {
        user: userId,
        type: "deposit",
        amount: 500,
        description: "Nạp 500 xu vào tài khoản",
        paymentMethod: "bank_transfer",
        status: "completed",
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      },
      {
        user: userId,
        type: "purchase",
        amount: 5,
        description: "Mua chương 1 truyện 'Đấu La Đại Lục'",
        paymentMethod: "coin",
        status: "completed",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      },
      {
        user: userId,
        type: "purchase",
        amount: 5,
        description: "Mua chương 2 truyện 'Đấu La Đại Lục'",
        paymentMethod: "coin",
        status: "completed",
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
      },
      {
        user: userId,
        type: "reward",
        amount: 20,
        description: "Thưởng đăng nhập 7 ngày liên tiếp",
        paymentMethod: "free",
        status: "completed",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
      {
        user: userId,
        type: "deposit",
        amount: 200,
        description: "Nạp 200 xu vào tài khoản",
        paymentMethod: "credit_card",
        status: "completed",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      },
    ];

    // Save all transactions
    await Transaction.insertMany(sampleTransactions);

    // Update user's coin balance
    const totalAmount = sampleTransactions.reduce((total, transaction) => {
      if (["deposit", "reward"].includes(transaction.type)) {
        return total + transaction.amount;
      } else if (transaction.type === "purchase") {
        return total - transaction.amount;
      }
      return total;
    }, 0);

    user.coins = (user.coins || 0) + totalAmount;
    await user.save();

    res.json({
      success: true,
      message: "Created 5 sample transactions",
      transactions: sampleTransactions,
    });
  } catch (error) {
    console.error("Error creating sample transactions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create sample transactions",
    });
  }
});

// @route   GET api/transactions/admin/list
// @desc    Get all transactions for admin
// @access  Admin
router.get("/admin/list", async (req, res) => {
  try {
    // Thông báo nội dung type của response
    res.setHeader("Content-Type", "application/json");

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
      // Try to find users matching the search term
      const users = await User.find({
        username: { $regex: req.query.search, $options: "i" },
      }).select("_id");

      const userIds = users.map((user) => user._id);

      filter.$or = [
        {
          _id: mongoose.Types.ObjectId.isValid(req.query.search)
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

    // Get transactions with sample data if no results
    let transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "username")
      .lean();

    // If no transactions are found, return an empty array instead of sample data
    if (transactions.length === 0) {
      transactions = [];
    }

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
    const transaction = await Transaction.findById(req.params.id)
      .populate("user", "username")
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

module.exports = router;
