const Transaction = require("../models/Transaction");
const User = require("../models/User");

// @desc    Tạo giao dịch nạp xu mới
// @route   POST /api/transactions/deposit
// @access  Private
exports.createDeposit = async (req, res) => {
  try {
    const { amount, paymentMethod } = req.body;

    // Validate đầu vào
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Số tiền không hợp lệ",
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn phương thức thanh toán",
      });
    }

    // Tính số xu sẽ nhận được
    // Giả sử 1000 VNĐ = 10 xu
    const coinsToAdd = Math.floor(amount / 1000) * 10;

    // Tạo giao dịch mới (ở trạng thái pending)
    const transaction = await Transaction.create({
      user: req.user.id,
      type: "deposit",
      amount,
      description: `Nạp ${coinsToAdd} xu vào tài khoản`,
      paymentMethod,
      status: "pending",
      reference: `DEP${Date.now()}${req.user.id.substr(-4)}`,
    });

    res.status(201).json({
      success: true,
      transaction,
      coinsToAdd,
    });

    // Trong thực tế, bạn sẽ kết nối với cổng thanh toán ở đây
    // Sau khi thanh toán thành công, cổng thanh toán sẽ callback để cập nhật trạng thái
    // Trong demo này, chúng ta sẽ giả lập việc thanh toán thành công
    setTimeout(async () => {
      try {
        // Cập nhật trạng thái giao dịch
        transaction.status = "completed";
        await transaction.save();

        // Cộng xu cho user
        const user = await User.findById(req.user.id);
        user.coins += coinsToAdd;
        await user.save();

        console.log(
          `Giao dịch ${transaction._id} hoàn thành: +${coinsToAdd} xu cho user ${user.name}`
        );
      } catch (error) {
        console.error("Lỗi xử lý thanh toán:", error);
      }
    }, 5000); // Giả lập độ trễ 5 giây
  } catch (error) {
    console.error("Lỗi tạo giao dịch nạp xu:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// @desc    Lấy tất cả giao dịch của user đang đăng nhập
// @route   GET /api/transactions
// @access  Private
exports.getMyTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    const query = { user: req.user.id };

    // Filter theo loại giao dịch
    if (req.query.type) {
      query.type = req.query.type;
    }

    // Filter theo trạng thái
    if (req.query.status) {
      query.status = req.query.status;
    }

    const total = await Transaction.countDocuments(query);

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: transactions.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      transactions,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách giao dịch:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// @desc    Lấy chi tiết 1 giao dịch
// @route   GET /api/transactions/:id
// @access  Private
exports.getTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy giao dịch",
      });
    }

    // Chỉ cho phép xem giao dịch của chính mình hoặc admin
    if (
      transaction.user &&
      transaction.user.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xem giao dịch này",
      });
    }

    res.status(200).json({
      success: true,
      transaction,
    });
  } catch (error) {
    console.error("Lỗi lấy chi tiết giao dịch:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// @desc    Xử lý callback từ cổng thanh toán (cho admin)
// @route   POST /api/transactions/:id/process
// @access  Private (Admin)
exports.processTransaction = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !["completed", "failed", "refunded"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái không hợp lệ",
      });
    }

    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy giao dịch",
      });
    }

    if (
      transaction.status === "completed" ||
      transaction.status === "refunded"
    ) {
      return res.status(400).json({
        success: false,
        message: "Giao dịch này đã được xử lý rồi",
      });
    }

    // Cập nhật trạng thái giao dịch
    transaction.status = status;
    await transaction.save();

    // Nếu giao dịch thành công và là giao dịch nạp xu
    if (status === "completed" && transaction.type === "deposit") {
      // Tính số xu
      const coinsToAdd = Math.floor(transaction.amount / 1000) * 10;

      // Cộng xu cho user
      const user = await User.findById(transaction.user);
      user.coins += coinsToAdd;
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái giao dịch thành công",
      transaction,
    });
  } catch (error) {
    console.error("Lỗi xử lý giao dịch:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};
