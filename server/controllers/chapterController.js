const Chapter = require("../models/Chapter");
const Story = require("../models/Story");
const User = require("../models/User");
const Transaction = require("../models/Transaction");

// @desc    Lấy tất cả chương của một truyện
// @route   GET /api/stories/:storyId/chapters
// @access  Public
exports.getChapters = async (req, res) => {
  try {
    const chapters = await Chapter.find({
      story: req.params.storyId,
      status: "published",
    })
      .sort({ number: 1 })
      .select("title number isVIP coinPrice views publishedAt");

    res.status(200).json({
      success: true,
      count: chapters.length,
      chapters,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách chương:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// @desc    Lấy chi tiết 1 chương
// @route   GET /api/chapters/:id
// @access  Mixed (Public cho chương miễn phí, Private cho chương VIP)
exports.getChapter = async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.id).populate(
      "story",
      "title isVIP"
    );

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy chương",
      });
    }

    // Kiểm tra chương đã được published chưa
    if (chapter.status !== "published") {
      if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Chương này chưa được công bố",
        });
      }
    }

    // Kiểm tra quyền xem chương VIP
    if (chapter.isVIP && chapter.coinPrice > 0) {
      if (!req.user || req.user.role !== "admin") {
        // Kiểm tra xem user đã mua chương này chưa
        const transaction = await Transaction.findOne({
          user: req.user ? req.user.id : null,
          type: "purchase",
          reference: chapter._id ? chapter._id.toString() : null,
          status: "completed",
        });
        if (!transaction) {
          return res.status(402).json({
            success: false,
            message: "Bạn cần mua chương này để đọc",
            isVIP: true,
            coinPrice: chapter.coinPrice,
          });
        }
      }
    }

    // Tăng lượt xem
    chapter.views += 1;
    await chapter.save();

    // Cập nhật lịch sử đọc nếu user đã đăng nhập
    if (req.user) {
      let storyId = null;
      if (
        chapter.story &&
        typeof chapter.story === "object" &&
        chapter.story._id
      ) {
        storyId = chapter.story._id;
      } else if (chapter.story) {
        storyId = chapter.story;
      }
      if (storyId) {
        await User.findByIdAndUpdate(req.user.id, {
          $pull: { readingHistory: { story: storyId } },
        });
        await User.findByIdAndUpdate(req.user.id, {
          $push: {
            readingHistory: {
              story: storyId,
              chapter: chapter._id,
              readAt: new Date(),
            },
          },
        });
      }
    }

    res.status(200).json({
      success: true,
      chapter,
    });
  } catch (error) {
    console.error("Lỗi lấy chi tiết chương:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// @desc    Tạo chương mới
// @route   POST /api/stories/:storyId/chapters
// @access  Private (Author hoặc Admin)
exports.createChapter = async (req, res) => {
  try {
    const story = await Story.findById(req.params.storyId);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy truyện",
      });
    }

    // Kiểm tra quyền tạo chương
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Chỉ admin mới có quyền thêm chương cho truyện này",
      });
    }

    // Đếm số chương hiện tại để xác định số thứ tự
    const chapterCount = await Chapter.countDocuments({
      story: req.params.storyId,
    });

    // Tạo chương mới
    const chapter = await Chapter.create({
      story: req.params.storyId,
      title: req.body.title,
      content: req.body.content,
      number: chapterCount + 1,
      isVIP: req.body.isVIP || false,
      coinPrice: req.body.coinPrice || 0,
      status: req.body.status || "pending",
    });

    if (chapter.status === "published") {
      chapter.publishedAt = Date.now();
      await chapter.save();
    }

    res.status(201).json({
      success: true,
      chapter,
    });
  } catch (error) {
    console.error("Lỗi tạo chương mới:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// @desc    Cập nhật chương
// @route   PUT /api/chapters/:id
// @access  Private (Author hoặc Admin)
exports.updateChapter = async (req, res) => {
  try {
    let chapter = await Chapter.findById(req.params.id);

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy chương",
      });
    }

    // Kiểm tra quyền sửa chương
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Chỉ admin mới có quyền thao tác với chương!",
      });
    }

    // Nếu chuyển từ pending sang published thì cập nhật thời gian xuất bản
    if (chapter.status !== "published" && req.body.status === "published") {
      req.body.publishedAt = Date.now();
    }

    // Cập nhật chương
    chapter = await Chapter.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    // Cập nhật thời gian sửa truyện
    await Story.findByIdAndUpdate(chapter.story, {
      updatedAt: Date.now(),
    });

    res.status(200).json({
      success: true,
      chapter,
    });
  } catch (error) {
    console.error("Lỗi cập nhật chương:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// @desc    Xóa chương
// @route   DELETE /api/chapters/:id
// @access  Private (Author hoặc Admin)
exports.deleteChapter = async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.id);

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy chương",
      });
    }

    // Kiểm tra quyền xóa chương
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Chỉ admin mới có quyền xóa chương!",
      });
    }

    // Xóa chương
    await chapter.remove();

    res.status(200).json({
      success: true,
      message: "Xóa chương thành công",
    });
  } catch (error) {
    console.error("Lỗi xóa chương:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// @desc    Mua chương VIP
// @route   POST /api/chapters/:id/purchase
// @access  Private
exports.purchaseChapter = async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.id).populate(
      "story",
      "title"
    );

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy chương",
      });
    }

    if (!chapter.isVIP || chapter.coinPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "Chương này không phải chương VIP",
      });
    }

    // Kiểm tra xem đã mua chương này chưa
    const existingTransaction = await Transaction.findOne({
      user: req.user.id,
      type: "purchase",
      reference: chapter._id.toString(),
      status: "completed",
    });

    if (existingTransaction) {
      return res.status(400).json({
        success: false,
        message: "Bạn đã mua chương này rồi",
      });
    }

    // Lấy thông tin user để kiểm tra số xu
    const user = await User.findById(req.user.id);

    if (user.coins < chapter.coinPrice) {
      return res.status(400).json({
        success: false,
        message: "Bạn không đủ xu để mua chương này",
        coinsNeeded: chapter.coinPrice,
        coinsAvailable: user.coins,
      });
    }

    // Trừ xu của user
    user.coins -= chapter.coinPrice;
    await user.save();

    // Tạo giao dịch mua chương
    await Transaction.create({
      user: req.user.id,
      type: "purchase",
      amount: chapter.coinPrice,
      description: `Mua chương "${chapter.title}" của truyện "${chapter.story.title}"`,
      paymentMethod: "coins",
      status: "completed",
      reference: chapter._id.toString(),
    });

    res.status(200).json({
      success: true,
      message: "Mua chương thành công",
      remainingCoins: user.coins,
    });
  } catch (error) {
    console.error("Lỗi mua chương:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};
