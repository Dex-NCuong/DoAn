const express = require("express");
const router = express.Router();
const { isAuth } = require("../../middleware/auth");
const CoinPackage = require("../../models/CoinPackage");

/**
 * @route   GET /api/coin-packages
 * @desc    Lấy tất cả các gói xu đang hoạt động (cho người dùng)
 * @access  Public
 */
router.get("/", async (req, res) => {
  try {
    const coinPackages = await CoinPackage.find({ status: "active" }).sort({
      featured: -1,
      price: 1,
    });

    res.json(coinPackages);
  } catch (err) {
    console.error("Lỗi khi lấy danh sách gói xu:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
});

/**
 * @route   GET /api/coin-packages/admin
 * @desc    Lấy tất cả các gói xu (cho admin)
 * @access  Private/Admin
 */
router.get("/admin", isAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status;
    const search = req.query.search || "";

    // Xây dựng query
    let query = {};

    // Filter theo status
    if (status && status !== "all") {
      query.status = status;
    }

    // Tìm kiếm theo packageId hoặc tên
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { packageId: { $regex: search, $options: "i" } },
      ];
    }

    // Lấy tổng số gói xu
    const total = await CoinPackage.countDocuments(query);

    // Lấy danh sách gói xu theo trang
    const packages = await CoinPackage.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      packages,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (err) {
    console.error("Lỗi khi lấy danh sách gói xu:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
});

/**
 * @route   GET /api/coin-packages/:id
 * @desc    Lấy thông tin một gói xu cụ thể
 * @access  Public
 */
router.get("/:id", async (req, res) => {
  try {
    const coinPackage = await CoinPackage.findById(req.params.id);

    if (!coinPackage) {
      return res.status(404).json({ message: "Không tìm thấy gói xu" });
    }

    res.json(coinPackage);
  } catch (err) {
    console.error("Lỗi khi lấy thông tin gói xu:", err);

    if (err.kind === "ObjectId") {
      return res.status(404).json({ message: "Không tìm thấy gói xu" });
    }

    res.status(500).json({ message: "Lỗi server" });
  }
});

/**
 * @route   POST /api/coin-packages
 * @desc    Tạo gói xu mới
 * @access  Private/Admin
 */
router.post("/", isAuth, async (req, res) => {
  try {
    const {
      packageId,
      name,
      coins,
      price,
      discount,
      description,
      status,
      featured,
    } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!packageId || !name || !coins || !price) {
      return res
        .status(400)
        .json({ message: "Vui lòng điền đầy đủ thông tin bắt buộc" });
    }

    // Tạo gói xu mới
    const newPackage = new CoinPackage({
      packageId,
      name,
      coins,
      price,
      discount: discount || 0,
      description,
      status: status || "active",
      featured: featured || false,
    });

    // Lưu vào database
    const savedPackage = await newPackage.save();

    res.status(201).json(savedPackage);
  } catch (err) {
    console.error("Lỗi khi tạo gói xu:", err);

    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((val) => val.message);
      return res.status(400).json({ message: messages.join(", ") });
    }

    res.status(500).json({ message: "Lỗi server" });
  }
});

/**
 * @route   PUT /api/coin-packages/:id
 * @desc    Cập nhật thông tin gói xu
 * @access  Private/Admin
 */
router.put("/:id", isAuth, async (req, res) => {
  try {
    const { name, coins, price, discount, description, status, featured } =
      req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!name || !coins || !price) {
      return res
        .status(400)
        .json({ message: "Vui lòng điền đầy đủ thông tin bắt buộc" });
    }

    // Tìm gói xu và cập nhật
    const coinPackage = await CoinPackage.findById(req.params.id);

    if (!coinPackage) {
      return res.status(404).json({ message: "Không tìm thấy gói xu" });
    }

    // Cập nhật thông tin
    coinPackage.name = name;
    coinPackage.coins = coins;
    coinPackage.price = price;
    coinPackage.discount = discount || 0;
    coinPackage.description = description;
    coinPackage.status = status || "active";
    coinPackage.featured = featured || false;

    // Lưu vào database
    const updatedPackage = await coinPackage.save();

    res.json(updatedPackage);
  } catch (err) {
    console.error("Lỗi khi cập nhật gói xu:", err);

    if (err.kind === "ObjectId") {
      return res.status(404).json({ message: "Không tìm thấy gói xu" });
    }

    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((val) => val.message);
      return res.status(400).json({ message: messages.join(", ") });
    }

    res.status(500).json({ message: "Lỗi server" });
  }
});

/**
 * @route   DELETE /api/coin-packages/:id
 * @desc    Xóa gói xu
 * @access  Private/Admin
 */
router.delete("/:id", isAuth, async (req, res) => {
  try {
    const coinPackage = await CoinPackage.findById(req.params.id);

    if (!coinPackage) {
      return res.status(404).json({ message: "Không tìm thấy gói xu" });
    }

    await coinPackage.deleteOne();

    res.json({ message: "Xóa gói xu thành công" });
  } catch (err) {
    console.error("Lỗi khi xóa gói xu:", err);

    if (err.kind === "ObjectId") {
      return res.status(404).json({ message: "Không tìm thấy gói xu" });
    }

    res.status(500).json({ message: "Lỗi server" });
  }
});

/**
 * @route   GET /api/coin-packages/by-code/:packageId
 * @desc    Lấy gói xu theo packageId
 * @access  Private/Admin
 */
router.get("/by-code/:packageId", isAuth, async (req, res) => {
  const pkg = await CoinPackage.findOne({ packageId: req.params.packageId });
  if (!pkg) return res.status(404).json({ message: "Không tìm thấy gói xu" });
  res.json(pkg);
});

/**
 * @route   PUT /api/coin-packages/by-code/:packageId
 * @desc    Cập nhật gói xu theo packageId
 * @access  Private/Admin
 */
router.put("/by-code/:packageId", isAuth, async (req, res) => {
  const pkg = await CoinPackage.findOneAndUpdate(
    { packageId: req.params.packageId },
    req.body,
    { new: true }
  );
  if (!pkg) return res.status(404).json({ message: "Không tìm thấy gói xu" });
  res.json(pkg);
});

/**
 * @route   DELETE /api/coin-packages/by-code/:packageId
 * @desc    Xóa gói xu theo packageId
 * @access  Private/Admin
 */
router.delete("/by-code/:packageId", isAuth, async (req, res) => {
  const pkg = await CoinPackage.findOneAndDelete({
    packageId: req.params.packageId,
  });
  if (!pkg) return res.status(404).json({ message: "Không tìm thấy gói xu" });
  res.json({ message: "Xóa gói xu thành công" });
});

module.exports = router;
