const Story = require("../models/Story");
const Chapter = require("../models/Chapter");
const Genre = require("../models/Genre");
const Rating = require("../models/Rating");
const User = require("../models/User");

// Get all stories with filtering and sorting
exports.getAllStories = async (req, res) => {
  try {
    // Extract query parameters with default values
    const {
      page = 1,
      limit = 12,
      sort = "newest",
      genre = "",
      status = "",
      search = "",
      category = "",
    } = req.query;

    // Build query - empty object by default to get all stories
    const query = {};
    console.log("Initial query:", query);

    // Only add filters if they are provided
    if (category === "hot") {
      query.isHot = true;
    } else if (category === "new") {
      query.isNew = true;
    } else if (category === "full") {
      query.status = "completed";
    }

    if (genre) {
      query.genres = genre;
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$text = { $search: search };
    }

    console.log("Final query after filters:", query);

    // Sort options - default to newest if no sort option provided
    let sortOption = {};
    switch (sort) {
      case "newest":
        sortOption = { createdAt: -1 };
        break;
      case "oldest":
        sortOption = { createdAt: 1 };
        break;
      case "most_viewed":
        sortOption = { views: -1 };
        break;
      case "highest_rated":
        sortOption = { "rating.average": -1 };
        break;
      case "most_chapters":
        sortOption = { chapterCount: -1 };
        break;
      default:
        sortOption = { createdAt: -1 }; // Default sort by newest
    }

    console.log("Sort option:", sortOption);

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get all stories if no filters are applied (empty query)
    let stories = await Story.find(query)
      .populate("genres", "name")
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    console.log(`Found ${stories.length} stories`);

    // Calculate dynamic ratings for each story
    stories = await Promise.all(
      stories.map(async (story) => {
        const ratings = await Rating.find({ story: story._id });
        const ratingCount = ratings.length;
        let averageRating = 0;

        if (ratingCount > 0) {
          const ratingSum = ratings.reduce((sum, item) => sum + item.rating, 0);
          averageRating = parseFloat((ratingSum / ratingCount).toFixed(1));
        }

        return {
          ...story,
          rating: {
            average: averageRating,
            count: ratingCount,
          },
        };
      })
    );

    // Get total count for pagination
    const totalStories = await Story.countDocuments(query);
    const totalPages = Math.ceil(totalStories / parseInt(limit));

    // Get all genres for filter sidebar
    const genres = await Genre.find().sort({ name: 1 });

    // Return JSON response
    res.status(200).json({
      success: true,
      data: {
        stories,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalStories,
        },
        genres,
        filters: {
          genre,
          status,
          sort,
          search,
          category,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching stories:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi tải danh sách truyện.",
    });
  }
};

// Get single story details
exports.getStoryDetail = async (req, res) => {
  try {
    const { id } = req.params;

    // Increment view count
    await Story.findByIdAndUpdate(id, { $inc: { views: 1 } });

    // Get story with genres
    const story = await Story.findById(id).populate("genres");

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Truyện không tồn tại hoặc đã bị xóa.",
      });
    }

    // Get chapters
    const chapters = await Chapter.find({
      story: id,
      status: "published",
    })
      .sort({ number: 1 })
      .select("title number isFree coinPrice views createdAt");

    // Get ratings
    const ratings = await Rating.find({ story: id })
      .populate("user", "username avatar")
      .sort({ createdAt: -1 })
      .limit(10);

    // Get author's other stories
    const authorStories = await Story.find({
      author: story.author,
      _id: { $ne: id },
      status: "published",
    })
      .select("title views")
      .limit(3);

    // Get top stories
    const topStories = await Story.find({
      status: "published",
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
    })
      .sort({ views: -1 })
      .select("title views")
      .limit(10);

    // Check if user is following the story
    let isFollowing = false;
    if (req.session.userId) {
      const user = await User.findById(req.session.userId);
      isFollowing = user.followedStories.includes(id);
    }

    res.status(200).json({
      success: true,
      data: {
        story,
        chapters,
        ratings,
        authorStories,
        topStories,
        isFollowing,
        isLoggedIn: !!req.session.userId,
      },
    });
  } catch (error) {
    console.error("Error fetching story details:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi tải chi tiết truyện.",
    });
  }
};

// Follow/unfollow story
exports.toggleFollowStory = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: "Vui lòng đăng nhập để theo dõi truyện.",
      });
    }

    const { id } = req.params;
    const userId = req.session.userId;

    const user = await User.findById(userId);

    // Toggle follow status
    const isFollowing = user.followedStories.includes(id);

    if (isFollowing) {
      // Unfollow
      await User.findByIdAndUpdate(userId, {
        $pull: { followedStories: id },
      });
      res.json({ success: true, following: false });
    } else {
      // Follow
      await User.findByIdAndUpdate(userId, {
        $addToSet: { followedStories: id },
      });
      res.json({ success: true, following: true });
    }
  } catch (error) {
    console.error("Error toggling follow status:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi thay đổi trạng thái theo dõi.",
    });
  }
};

// Rate story
exports.rateStory = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: "Vui lòng đăng nhập để đánh giá truyện.",
      });
    }

    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.session.userId;

    // Check if story exists
    const story = await Story.findById(id);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Truyện không tồn tại.",
      });
    }

    // Check if user already rated this story
    let userRating = await Rating.findOne({ story: id, user: userId });

    if (userRating) {
      // Update existing rating
      userRating.rating = rating;
      userRating.comment = comment;
      await userRating.save();
    } else {
      // Create new rating
      userRating = new Rating({
        story: id,
        user: userId,
        rating,
        comment,
      });
      await userRating.save();
    }

    // Update story rating
    const allRatings = await Rating.find({ story: id });
    const ratingSum = allRatings.reduce((sum, item) => sum + item.rating, 0);
    const ratingAvg = ratingSum / allRatings.length;

    await Story.findByIdAndUpdate(id, {
      "rating.average": ratingAvg.toFixed(1),
      "rating.count": allRatings.length,
    });

    res.json({
      success: true,
      message: "Cảm ơn bạn đã đánh giá!",
      newRating: ratingAvg.toFixed(1),
      ratingCount: allRatings.length,
    });
  } catch (error) {
    console.error("Error rating story:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi đánh giá truyện.",
    });
  }
};

// Admin API - Get all stories for admin
exports.getAdminStories = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "", status = "" } = req.query;

    // Build query
    const query = {};
    if (search) {
      query.title = { $regex: search, $options: "i" };
    }
    if (status) {
      query.status = status;
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

    res.status(200).json({
      success: true,
      data: {
        stories,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalStories,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching admin stories:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy danh sách truyện.",
    });
  }
};

// Admin API - Create new story
exports.createStory = async (req, res) => {
  try {
    console.log("Creating new story with data:", req.body);
    console.log("Files:", req.file);

    const { title, author, description, status, isHot, isNew } = req.body;

    let genres = [];
    // Xử lý genres có thể đến dưới dạng array hoặc JSON string
    if (req.body.genres) {
      try {
        if (typeof req.body.genres === "string") {
          genres = JSON.parse(req.body.genres);
        } else if (Array.isArray(req.body.genres)) {
          genres = req.body.genres;
        }
      } catch (parseError) {
        console.error("Error parsing genres:", parseError);
      }
    }

    // Lấy cover image từ request nếu có
    let coverImage = "/images/default-cover.jpg";
    if (req.file) {
      coverImage = `/uploads/covers/${req.file.filename}`;
    } else if (req.body.coverImage) {
      coverImage = req.body.coverImage;
    }

    // Kiểm tra dữ liệu đầu vào
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Tiêu đề truyện không được để trống.",
      });
    }

    if (!author || !author.trim()) {
      return res.status(400).json({
        success: false,
        message: "Tên tác giả không được để trống.",
      });
    }

    // Chuyển đổi chuỗi "true"/"false" thành boolean
    const isHotBool = isHot === "true" || isHot === true;
    const isNewBool = isNew === "true" || isNew === true;

    try {
      // Create new story - không sử dụng new Story() để tránh validation mặc định
      const storyData = {
        title: title.trim(),
        author: author.trim(),
        description: description || "", // Đảm bảo description có giá trị mặc định
        coverImage: coverImage,
        genres: genres,
        status: status || "ongoing",
        isHot: isHotBool,
        isNew: isNewBool,
      };

      console.log("New story data:", storyData);
      const story = await Story.create(storyData);

      console.log("Story created successfully:", story);

      res.status(201).json({
        success: true,
        data: story,
        message: "Truyện đã được tạo thành công.",
      });
    } catch (dbError) {
      console.error("Database error creating story:", dbError);
      return res.status(400).json({
        success: false,
        message: "Lỗi khi tạo truyện trong cơ sở dữ liệu",
        error: dbError.message,
      });
    }
  } catch (error) {
    console.error("Error creating story:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi tạo truyện mới.",
      error: error.message,
    });
  }
};

// Admin API - Get story by ID
exports.getStoryById = async (req, res) => {
  try {
    const { storyId } = req.params;

    const story = await Story.findById(storyId).populate("genres");

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy truyện.",
      });
    }

    res.status(200).json({
      success: true,
      data: story,
    });
  } catch (error) {
    console.error("Error fetching story by ID:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy thông tin truyện.",
    });
  }
};

// Admin API - Update story
exports.updateStory = async (req, res) => {
  try {
    console.log("Cập nhật truyện với ID:", req.params.storyId);
    console.log("Dữ liệu cập nhật:", req.body);
    console.log("File:", req.file);

    const { storyId } = req.params;
    const { title, author, description, status, isHot, isNew } = req.body;

    // Kiểm tra truyện tồn tại
    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy truyện.",
      });
    }

    // Xử lý genres tương tự như khi tạo mới
    let genres = [];
    if (req.body.genres) {
      try {
        if (typeof req.body.genres === "string") {
          genres = JSON.parse(req.body.genres);
        } else if (Array.isArray(req.body.genres)) {
          genres = req.body.genres;
        }
      } catch (parseError) {
        console.error("Error parsing genres:", parseError);
        // Giữ nguyên thể loại cũ nếu có lỗi
        genres = story.genres;
      }
    }

    // Xử lý cover image
    let coverImage = story.coverImage; // Giữ nguyên ảnh cũ nếu không có ảnh mới
    if (req.file) {
      coverImage = `/uploads/covers/${req.file.filename}`;
    } else if (req.body.coverImage) {
      coverImage = req.body.coverImage;
    }

    // Kiểm tra dữ liệu đầu vào
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Tiêu đề truyện không được để trống.",
      });
    }

    if (!author || !author.trim()) {
      return res.status(400).json({
        success: false,
        message: "Tên tác giả không được để trống.",
      });
    }

    // Chuyển đổi chuỗi "true"/"false" thành boolean
    const isHotBool = isHot === "true" || isHot === true;
    const isNewBool = isNew === "true" || isNew === true;

    // Update story
    const updatedStory = await Story.findByIdAndUpdate(
      storyId,
      {
        title: title.trim(),
        author: author.trim(),
        description: description || "",
        coverImage: coverImage,
        genres: genres,
        status: status || "ongoing",
        isHot: isHotBool,
        isNew: isNewBool,
        updatedAt: Date.now(),
      },
      { new: true }
    ).populate("genres");

    res.status(200).json({
      success: true,
      data: updatedStory,
      message: "Truyện đã được cập nhật thành công.",
    });
  } catch (error) {
    console.error("Error updating story:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi cập nhật truyện.",
      error: error.message,
    });
  }
};

// Admin API - Delete story
exports.deleteStory = async (req, res) => {
  try {
    const { storyId } = req.params;

    const story = await Story.findById(storyId);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy truyện.",
      });
    }

    // Delete story and all related chapters
    await Story.findByIdAndDelete(storyId);
    await Chapter.deleteMany({ story: storyId });

    res.status(200).json({
      success: true,
      message: "Truyện đã được xóa thành công.",
    });
  } catch (error) {
    console.error("Error deleting story:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi xóa truyện.",
    });
  }
};

// Admin API - Get all genres
exports.getAllGenres = async (req, res) => {
  try {
    const genres = await Genre.find().sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: genres,
    });
  } catch (error) {
    console.error("Error fetching genres:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy danh sách thể loại.",
    });
  }
};
