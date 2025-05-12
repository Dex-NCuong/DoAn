const Story = require("../models/Story");
const Chapter = require("../models/Chapter");
const Genre = require("../models/Genre");
const User = require("../models/User");

// @desc    Lấy tất cả truyện (có phân trang và filter)
// @route   GET /api/stories
// @access  Public
exports.getStories = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    // Build query
    const query = {};

    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by genre
    if (req.query.genre) {
      query.genres = req.query.genre;
    }

    // Filter by VIP
    if (req.query.isVIP) {
      query.isVIP = req.query.isVIP === "true";
    }

    // Search by title
    if (req.query.search) {
      query.title = { $regex: req.query.search, $options: "i" };
    }

    const total = await Story.countDocuments(query);

    // Sắp xếp
    let sort = {};
    if (req.query.sort) {
      switch (req.query.sort) {
        case "latest":
          sort = { createdAt: -1 };
          break;
        case "popular":
          sort = { views: -1 };
          break;
        case "rating":
          sort = { avgRating: -1 };
          break;
        default:
          sort = { updatedAt: -1 };
      }
    } else {
      sort = { updatedAt: -1 };
    }

    const stories = await Story.find(query)
      .populate("genres", "name")
      .sort(sort)
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: stories.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      stories,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách truyện:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// @desc    Lấy chi tiết 1 truyện
// @route   GET /api/stories/:id
// @access  Public
exports.getStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
      .populate("genres", "name")
      .populate({
        path: "chapters",
        match: { status: "published" },
        options: { sort: { number: 1 } },
        select: "title number views isVIP coinPrice publishedAt",
      })
      .populate({
        path: "ratings.user",
        select: "name avatar",
      });

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy truyện",
      });
    }

    res.status(200).json({
      success: true,
      story,
    });
  } catch (error) {
    console.error("Lỗi lấy chi tiết truyện:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// @desc    Tạo truyện mới
// @route   POST /api/stories
// @access  Private (Author hoặc Admin)
exports.createStory = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Chỉ admin mới có quyền thêm truyện!",
      });
    }

    if (!req.body.author || !req.body.author.trim()) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập tên tác giả",
      });
    }

    // Tạo truyện mới
    const story = await Story.create(req.body);

    // Cập nhật thể loại
    if (req.body.genres && req.body.genres.length > 0) {
      await Promise.all(
        req.body.genres.map(async (genreId) => {
          const genre = await Genre.findById(genreId);
          if (genre) {
            genre.stories.push(story._id);
            await genre.save();
          }
        })
      );
    }

    res.status(201).json({
      success: true,
      story,
    });
  } catch (error) {
    console.error("Lỗi tạo truyện mới:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// @desc    Cập nhật truyện
// @route   PUT /api/stories/:id
// @access  Private (Author của truyện hoặc Admin)
exports.updateStory = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Chỉ admin mới có quyền thao tác với truyện!",
      });
    }

    if (!req.body.author || !req.body.author.trim()) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập tên tác giả",
      });
    }

    let story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy truyện",
      });
    }

    // Cập nhật truyện
    story = await Story.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      story,
    });
  } catch (error) {
    console.error("Lỗi cập nhật truyện:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// @desc    Xóa truyện
// @route   DELETE /api/stories/:id
// @access  Private (Author của truyện hoặc Admin)
exports.deleteStory = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Chỉ admin mới có quyền thao tác với truyện!",
      });
    }

    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy truyện",
      });
    }

    // Xóa các chương thuộc truyện
    await Chapter.deleteMany({ story: req.params.id });

    // Xóa truyện khỏi danh sách thể loại
    if (story.genres && story.genres.length > 0) {
      await Promise.all(
        story.genres.map(async (genreId) => {
          const genre = await Genre.findById(genreId);
          if (genre) {
            genre.stories = genre.stories.filter(
              (storyId) => storyId && storyId.toString() !== req.params.id
            );
            await genre.save();
          }
        })
      );
    }

    // Xóa truyện
    await story.remove();

    res.status(200).json({
      success: true,
      message: "Xóa truyện thành công",
    });
  } catch (error) {
    console.error("Lỗi xóa truyện:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// @desc    Thích truyện
// @route   POST /api/stories/:id/like
// @access  Private
exports.likeStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy truyện",
      });
    }

    // Tăng số lượt thích
    story.likes += 1;
    await story.save();

    // Thêm vào danh sách truyện yêu thích của user
    const user = await User.findById(req.user.id);
    if (!user.favoriteStories.includes(req.params.id)) {
      user.favoriteStories.push(req.params.id);
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: "Đã thêm vào truyện yêu thích",
      likes: story.likes,
    });
  } catch (error) {
    console.error("Lỗi thích truyện:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// @desc    Đánh giá truyện
// @route   POST /api/stories/:id/rate
// @access  Private
exports.rateStory = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng đánh giá từ 1-5 sao",
      });
    }

    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy truyện",
      });
    }

    // Kiểm tra xem user đã đánh giá truyện này chưa
    const existingRatingIndex = story.ratings.findIndex(
      (r) => r.user.toString() === req.user.id
    );

    if (existingRatingIndex !== -1) {
      // Cập nhật đánh giá cũ
      story.ratings[existingRatingIndex].rating = rating;
      story.ratings[existingRatingIndex].comment = comment || "";
      story.ratings[existingRatingIndex].date = Date.now();
    } else {
      // Thêm đánh giá mới
      story.ratings.push({
        user: req.user.id,
        rating,
        comment: comment || "",
        date: Date.now(),
      });
    }

    // Tính lại đánh giá trung bình
    story.calculateAverageRating();
    await story.save();

    res.status(200).json({
      success: true,
      message: "Đánh giá thành công",
      avgRating: story.avgRating,
    });
  } catch (error) {
    console.error("Lỗi đánh giá truyện:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// @desc    Lấy danh sách truyện cho admin
// @route   GET /api/stories/admin/list
// @access  Private (Admin)
exports.getStoriesForAdmin = async (req, res) => {
  try {
    console.log("Getting stories for admin...");

    // Query tất cả truyện không cần phân trang - với xử lý lỗi tốt hơn
    let stories = [];

    try {
      stories = await Story.find()
        .select("_id title author")
        .sort({ title: 1 });

      console.log(`Found ${stories.length} stories for admin`);
    } catch (modelError) {
      console.error("Error accessing Story model:", modelError);
      // Fallback - nếu có lỗi với model, trả về mảng rỗng
      stories = [];
    }

    res.status(200).json({
      success: true,
      stories,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách truyện cho admin:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};
