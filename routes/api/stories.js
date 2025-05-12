const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const auth = require("../../middleware/auth");
const adminAuth = require("../../middleware/adminAuth");
const Story = require("../../models/Story");
const Chapter = require("../../models/Chapter");
const User = require("../../models/User");
const Genre = require("../../models/Genre");
const Rating = require("../../models/Rating");
const StoryView = require("../../models/StoryView");

// @route   GET api/stories/search-suggestions
// @desc    Get story title suggestions based on search term
// @access  Public
router.get("/search-suggestions", async (req, res) => {
  try {
    const searchTerm = req.query.q || "";
    console.log("Received search term:", searchTerm);

    if (!searchTerm || searchTerm.length < 2) {
      return res.json({ success: true, suggestions: [] });
    }

    // Create search pattern that matches both accented and non-accented characters
    const searchPattern = searchTerm
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    console.log("Normalized search pattern:", searchPattern);

    // Convert search terms to handle both accented and non-accented characters
    const searchTerms = searchPattern
      .split(/\s+/)
      .filter((term) => term.length > 0);

    // Create regex patterns for each term
    const regexPatterns = searchTerms.map((term) => {
      // Map common character variations
      const charMap = {
        a: "[aáàảãạâấầẩẫậăắằẳẵặ]",
        e: "[eéèẻẽẹêếềểễệ]",
        i: "[iíìỉĩị]",
        o: "[oóòỏõọôốồổỗộơớờởỡợ]",
        u: "[uúùủũụưứừửữự]",
        y: "[yýỳỷỹỵ]",
        d: "[dđ]",
      };

      // Replace characters with their variations
      let pattern = term
        .split("")
        .map((char) => charMap[char] || char)
        .join("");
      return new RegExp(pattern, "i");
    });

    // Find stories that match all search terms
    const stories = await Story.find({
      status: { $in: ["ongoing", "completed", "paused"] },
      $and: regexPatterns.map((pattern) => ({
        title: { $regex: pattern },
      })),
    })
      .select("title _id")
      .limit(10)
      .lean();

    console.log("Found stories:", stories);

    res.json({
      success: true,
      suggestions: stories.map((story) => ({
        id: story._id,
        title: story.title,
      })),
    });
  } catch (err) {
    console.error("Error getting search suggestions:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy gợi ý tìm kiếm",
    });
  }
});

// Multer config for cover image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = "public/uploads/covers";
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    cb(null, "cover-" + uniqueSuffix + extension);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(
      new Error(
        "Chỉ chấp nhận hình ảnh với định dạng .jpeg, .jpg, .png, hoặc .webp"
      )
    );
  },
});

// @route   GET api/stories/related
// @desc    Get related stories based on genres
// @access  Public
router.get("/related", async (req, res) => {
  try {
    const { storyId, genres } = req.query;
    console.log("Nhận request tìm truyện cùng thể loại:", { storyId, genres });

    if (!storyId || !genres) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    // Convert genres string to array and decode
    const genreList = genres.split(",").map((g) => decodeURIComponent(g));
    console.log("Các thể loại cần tìm:", genreList);

    // Tìm các Genre documents với tên trong genreList
    const genreDocuments = await Genre.find({
      name: { $in: genreList },
    });
    console.log("Tìm thấy genre documents:", genreDocuments);

    if (!genreDocuments || genreDocuments.length === 0) {
      console.log("Không tìm thấy genre documents nào!");
      return res.json([]);
    }

    // Lấy các ID của genres
    const genreIds = genreDocuments.map((genre) => genre._id);
    console.log("Genre IDs cần tìm:", genreIds);

    // Tìm truyện hiện tại để lấy thông tin chi tiết
    const currentStory = await Story.findById(storyId).populate("genres");
    if (!currentStory) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy truyện hiện tại" });
    }

    // Tìm các truyện có chứa ít nhất một trong các genre IDs
    const stories = await Story.find({
      _id: { $ne: new mongoose.Types.ObjectId(storyId) }, // Sử dụng new để tạo ObjectId
      genres: { $in: genreIds },
      status: { $in: ["ongoing", "completed", "paused"] },
    })
      .populate("genres", "name")
      .sort({ views: -1 })
      .limit(8)
      .lean();

    console.log("Tìm thấy số truyện:", stories.length);
    console.log(
      "Danh sách truyện tìm thấy:",
      stories.map((s) => ({
        title: s.title,
        genres: s.genres.map((g) => g.name),
      }))
    );

    // Lấy số chương cho mỗi truyện
    const storiesWithChapters = await Promise.all(
      stories.map(async (story) => {
        const totalChapters = await Chapter.countDocuments({
          story: story._id,
          status: "published",
        });

        return {
          ...story,
          totalChapters,
          genres: story.genres.map((g) => g.name),
        };
      })
    );

    console.log("Số truyện cuối cùng:", storiesWithChapters.length);
    res.json(storiesWithChapters);
  } catch (error) {
    console.error("Lỗi khi tìm truyện cùng thể loại:", error);
    res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
});

// @route   GET api/stories/hot
// @desc    Get top stories by views
// @access  Public
router.get("/hot", async (req, res) => {
  try {
    console.log("Getting top stories with params:", req.query);
    const period = req.query.period || "day"; // day, month, year
    const limit = parseInt(req.query.limit) || 10;

    // Calculate date range based on period
    const now = new Date();
    let startDate;
    switch (period) {
      case "day":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return res.status(400).json({
          success: false,
          message:
            "Khoảng thời gian không hợp lệ. Chỉ chấp nhận: day, month, year",
        });
    }

    console.log("Date range:", { startDate, now });

    // Get top stories by views in the specified period
    const topStories = await StoryView.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: now },
        },
      },
      {
        $group: {
          _id: "$story",
          totalViews: { $sum: "$views" },
        },
      },
      {
        $sort: { totalViews: -1 },
      },
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: "stories",
          localField: "_id",
          foreignField: "_id",
          as: "story",
        },
      },
      {
        $unwind: "$story",
      },
      {
        $project: {
          _id: "$story._id",
          title: "$story.title",
          author: "$story.author",
          coverImage: "$story.coverImage",
          views: "$totalViews",
          rating: "$story.rating",
          status: "$story.status",
        },
      },
    ]);

    console.log("Found top stories from StoryView:", topStories);

    // If no stories found in StoryView, get all stories sorted by views
    if (!topStories || topStories.length === 0) {
      console.log(
        "No stories found in StoryView, getting all stories sorted by views"
      );
      const allStories = await Story.find()
        .sort({ views: -1 })
        .limit(limit)
        .select("_id title author coverImage views rating status")
        .lean();

      console.log("Found all stories:", allStories);

      return res.json({
        success: true,
        stories: allStories,
      });
    }

    res.json({
      success: true,
      stories: topStories,
    });
  } catch (err) {
    console.error("Error getting top stories:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách truyện hot",
    });
  }
});

// @route   GET api/stories
// @desc    Get all stories with pagination and filters
// @access  Public
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    // Build filter object
    const filter = {};

    // Filter by status if provided
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Filter for hot stories
    if (req.query.isHot === "true") {
      filter.isHot = true;
      // Ensure we only get stories explicitly marked as hot
      filter.$and = [{ isHot: { $exists: true } }, { isHot: true }];
    }

    // Filter for new stories
    if (req.query.isNew === "true") {
      filter.isNew = true;
    }

    // Filter by genre if provided
    if (req.query.genre) {
      try {
        // Validate ObjectId format first
        if (!mongoose.Types.ObjectId.isValid(req.query.genre)) {
          return res.status(400).json({
            success: false,
            message: "ID thể loại không hợp lệ",
          });
        }
        // Create ObjectId using new keyword
        filter.genres = new mongoose.Types.ObjectId(req.query.genre);
      } catch (err) {
        console.error("Invalid genre ID:", err);
        return res.status(400).json({
          success: false,
          message: "ID thể loại không hợp lệ",
        });
      }
    }

    // Filter by chapter count if provided
    if (req.query.chapterCount) {
      const match = req.query.chapterCount.match(/^lt(\d+)$/);
      if (match) {
        const count = parseInt(match[1]);
        if (!isNaN(count)) {
          // Use aggregation to filter by chapter count
          const storiesWithChapterCount = await Story.aggregate([
            {
              $lookup: {
                from: "chapters",
                let: { storyId: "$_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$story", "$$storyId"] },
                          { $eq: ["$status", "published"] },
                        ],
                      },
                    },
                  },
                ],
                as: "chapters",
              },
            },
            {
              $match: {
                $expr: { $lt: [{ $size: "$chapters" }, count] },
              },
            },
            {
              $project: { _id: 1 },
            },
          ]);

          // Add story IDs to filter
          filter._id = {
            $in: storiesWithChapterCount.map((story) => story._id),
          };
        }
      }
    }

    // Filter by search term if provided
    if (req.query.search) {
      filter.$or = [
        { title: { $regex: req.query.search, $options: "i" } },
        { author: { $regex: req.query.search, $options: "i" } },
        { description: { $regex: req.query.search, $options: "i" } },
      ];
    }

    console.log("API Query filters:", filter);

    // Count total stories for pagination
    const total = await Story.countDocuments(filter);

    // Get stories
    const stories = await Story.find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .populate("genres", "name")
      .lean();

    // Add chapter count to each story
    const storiesWithChapterCount = await Promise.all(
      stories.map(async (story) => {
        const chapterCount = await Chapter.countDocuments({
          story: story._id,
          status: "published",
        });

        // Get latest chapter
        const latestChapter = await Chapter.findOne({
          story: story._id,
          status: "published",
        })
          .sort({ number: -1 })
          .select("title number createdAt")
          .lean();

        return {
          ...story,
          chapterCount,
          latestChapter,
        };
      })
    );

    // Send response
    res.json({
      stories: storiesWithChapterCount,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error in stories route:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi tải danh sách truyện",
      error: err.message,
    });
  }
});

// @route   GET api/stories/:id
// @desc    Get story by ID
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
      .populate("genres", "name")
      .lean();

    if (!story) {
      return res.status(404).json({ msg: "Không tìm thấy truyện" });
    }

    // --- START: Calculate dynamic rating ---
    const ratings = await Rating.find({ story: story._id }).lean();
    const ratingCount = ratings.length;
    let averageRating = 0;

    if (ratingCount > 0) {
      const ratingSum = ratings.reduce((sum, item) => sum + item.rating, 0);
      averageRating = parseFloat((ratingSum / ratingCount).toFixed(1));
    } else {
      // Reset rating in the story document when there are no ratings
      await Story.findByIdAndUpdate(story._id, {
        $set: { rating: { average: 0, count: 0 } },
      });
    }
    // --- END: Calculate dynamic rating ---

    // Get chapters count and list
    const chaptersCount = await Chapter.countDocuments({
      story: story._id,
      status: "published",
    });

    // Lấy userId từ session hoặc từ header Authorization (JWT)
    let userId = null;
    if (req.session && req.session.userId) {
      userId = req.session.userId;
    } else if (req.headers && req.headers.authorization) {
      try {
        const token = req.headers.authorization.replace("Bearer ", "");
        const decoded = require("jsonwebtoken").verify(
          token,
          process.env.JWT_SECRET || "your_jwt_secret"
        );
        userId = decoded.id;
      } catch (e) {
        userId = null;
      }
    }

    // Lấy danh sách chương đã mua (nếu có userId)
    let purchasedChapters = [];
    if (userId) {
      const purchased = await require("../../models/Transaction")
        .find({
          user: userId,
          "use.target": "chapter",
          status: "completed",
        })
        .select("use.targetId");
      purchasedChapters = purchased.map((t) =>
        t.use.targetId ? t.use.targetId.toString() : null
      );
    }

    // Lấy danh sách chương và bổ sung trạng thái
    const chaptersRaw = await Chapter.find({
      story: story._id,
      status: "published",
    })
      .sort({ number: 1 })
      .select("title number isFree coinPrice createdAt")
      .lean();

    const chapters = chaptersRaw.map((chap) => {
      const isPurchased =
        userId &&
        purchasedChapters.includes(chap._id ? chap._id.toString() : null);
      return {
        ...chap,
        isFree: chap.isFree,
        isPurchased: !!isPurchased,
        isLocked: !chap.isFree && !isPurchased,
      };
    });

    // Get author details if it's a user
    let authorDetails = null;
    if (story.userId) {
      authorDetails = await User.findById(story.userId)
        .select("username avatar")
        .lean();
    }

    // Combine story with chapters info
    const result = {
      success: true,
      data: {
        story: {
          ...story,
          // Override with dynamic rating values, ensuring 0 values when no ratings exist
          averageRating: averageRating,
          ratingCount: ratingCount,
          rating: { average: averageRating, count: ratingCount }, // Add this to ensure frontend gets updated
          // Keep other calculated/populated fields
          chaptersCount,
          author: authorDetails ? authorDetails.username : story.author,
          authorAvatar: authorDetails ? authorDetails.avatar : null,
        },
        chapters,
        isLoggedIn: !!req.session.userId,
        isFollowing: false,
      },
    };

    // Check if user is following the story
    if (req.session.userId) {
      const user = await User.findById(req.session.userId);
      if (user) {
        const isFollowing = user.followedStories.some(
          (followed) =>
            followed.storyId && followed.storyId.toString() === req.params.id
        );
        result.data.isFollowing = isFollowing;
      }
    }

    res.json(result);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy truyện",
      });
    }
    res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
});

// @route   POST api/stories
// @desc    Create a new story
// @access  Private
router.post(
  "/",
  [auth.verifyToken, upload.single("cover")],
  async (req, res) => {
    try {
      const {
        title,
        description,
        author,
        genres,
        status = "pending",
      } = req.body;

      // Basic validation
      if (!title || !description) {
        return res
          .status(400)
          .json({ msg: "Vui lòng điền đầy đủ thông tin truyện" });
      }

      // Create new story object
      const newStory = new Story({
        title,
        description,
        author: author || req.user.username,
        userId: req.user.id,
        status: req.user.isAdmin ? status || "published" : "pending",
      });

      // Add cover image if uploaded
      if (req.file) {
        newStory.coverImage = `/uploads/covers/${req.file.filename}`;
      }

      // Add genres if provided
      if (genres) {
        // Convert genres string to array of ObjectIds
        newStory.genres = JSON.parse(genres).map((genre) =>
          mongoose.Types.ObjectId(genre)
        );
      }

      // Save story
      await newStory.save();

      // Return the created story
      res.json(newStory);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// @route   PUT api/stories/:id
// @desc    Update a story
// @access  Private
router.put(
  "/:id",
  [auth.verifyToken, upload.single("cover")],
  async (req, res) => {
    try {
      const { title, description, author, genres, status } = req.body;

      // Get story by ID
      const story = await Story.findById(req.params.id);

      if (!story) {
        return res.status(404).json({ msg: "Không tìm thấy truyện" });
      }

      // Check if user is authorized to update
      if (story.userId.toString() !== req.user.id && !req.user.isAdmin) {
        return res
          .status(401)
          .json({ msg: "Không có quyền cập nhật truyện này" });
      }

      // Update fields
      if (title) story.title = title;
      if (description) story.description = description;
      if (author) story.author = author;

      // Only admin can update status
      if (status && req.user.isAdmin) {
        story.status = status;
      }

      // Add cover image if uploaded
      if (req.file) {
        // Delete old cover if exists
        if (
          story.coverImage &&
          story.coverImage !== "/uploads/covers/default-cover.jpg"
        ) {
          const oldCoverPath = path.join(
            __dirname,
            "../../public",
            story.coverImage
          );
          if (fs.existsSync(oldCoverPath)) {
            fs.unlinkSync(oldCoverPath);
          }
        }

        story.coverImage = `/uploads/covers/${req.file.filename}`;
      }

      // Update genres if provided
      if (genres) {
        // Convert genres string to array of ObjectIds
        story.genres = JSON.parse(genres).map((genre) =>
          mongoose.Types.ObjectId(genre)
        );
      }

      // Save updated story
      await story.save();

      // Return the updated story
      res.json(story);
    } catch (err) {
      console.error(err.message);
      if (err.kind === "ObjectId") {
        return res.status(404).json({ msg: "Không tìm thấy truyện" });
      }
      res.status(500).send("Server Error");
    }
  }
);

// @route   DELETE api/stories/:id
// @desc    Delete a story
// @access  Private
router.delete("/:id", auth.verifyToken, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({ msg: "Không tìm thấy truyện" });
    }

    // Check if user is authorized to delete
    if (story.userId.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(401).json({ msg: "Không có quyền xóa truyện này" });
    }

    // Delete cover image if not default
    if (
      story.coverImage &&
      story.coverImage !== "/uploads/covers/default-cover.jpg"
    ) {
      const coverPath = path.join(__dirname, "../../public", story.coverImage);
      if (fs.existsSync(coverPath)) {
        fs.unlinkSync(coverPath);
      }
    }

    // Delete all chapters related to this story
    await Chapter.deleteMany({ story: story._id });

    // Delete the story
    await story.remove();

    res.json({ msg: "Đã xóa truyện thành công" });
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Không tìm thấy truyện" });
    }
    res.status(500).send("Server Error");
  }
});

// @route   GET api/stories/:id/chapters
// @desc    Get all chapters of a story
// @access  Public
router.get("/:id/chapters", async (req, res) => {
  try {
    const storyId = req.params.id;

    // Verify story exists
    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ msg: "Không tìm thấy truyện" });
    }

    // Get approved chapters
    const chapters = await Chapter.find({
      story: storyId,
      status: "published",
    })
      .sort({ number: 1 })
      .select("title number isFree createdAt")
      .lean();

    res.json(chapters);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Không tìm thấy truyện" });
    }
    res.status(500).send("Server Error");
  }
});

// @route   POST api/stories/:id/chapters
// @desc    Add a new chapter to a story
// @access  Private
router.post("/:id/chapters", auth.verifyToken, async (req, res) => {
  try {
    console.log("Creating new chapter for story:", req.params.id);
    console.log("Request body:", req.body);
    console.log("User ID from token:", req.userId);

    const { title, content, number, isVIP = false, coinPrice = 0 } = req.body;
    const storyId = req.params.id;

    // Basic validation
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng điền đầy đủ thông tin chương",
      });
    }

    // Verify story exists
    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy truyện",
      });
    }

    // Check if user is authorized to add chapters
    // Temporally allow all for admin user management
    /*
    if (
      story.userId &&
      story.userId.toString() !== req.userId &&
      req.userId !== "admin" // Simplified admin check
    ) {
      return res.status(401).json({
        success: false,
        message: "Không có quyền thêm chương cho truyện này",
      });
    }
    */

    // Find the highest chapter number if not provided
    let chapterNumber = number;
    if (!chapterNumber) {
      const highestChapter = await Chapter.findOne({ story: storyId })
        .sort({ number: -1 })
        .select("number");

      chapterNumber = highestChapter ? highestChapter.number + 1 : 1;
    }

    // Create new chapter
    const newChapter = new Chapter({
      story: storyId,
      title,
      content,
      number: chapterNumber,
      isFree: !isVIP,
      coinPrice: isVIP ? coinPrice : 0,
      author: req.userId || "admin", // Use userId from token or default to admin
      status: "published", // For now, publish all chapters (development mode)
    });

    // Save chapter
    await newChapter.save();

    // Update story's updatedAt
    story.updatedAt = Date.now();
    await story.save();

    console.log("Chapter created successfully:", newChapter._id);

    res.json({
      success: true,
      message: "Thêm chương mới thành công. Chương đã được xuất bản.",
      data: newChapter,
    });
  } catch (err) {
    console.error("Error creating chapter:", err);
    if (err.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy truyện",
      });
    }
    res.status(500).json({
      success: false,
      message: "Lỗi server khi tạo chương mới",
      error: err.message,
      stack: err.stack,
    });
  }
});

// @route   PUT api/stories/status/:id
// @desc    Update a story's status (admin only)
// @access  Admin
router.put("/status/:id", adminAuth, async (req, res) => {
  try {
    const { status } = req.body;

    // Validate status
    if (!["pending", "published", "rejected"].includes(status)) {
      return res.status(400).json({ msg: "Trạng thái không hợp lệ" });
    }

    // Find story
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({ msg: "Không tìm thấy truyện" });
    }

    // Update status
    story.status = status;

    // Add rejection reason if rejected
    if (status === "rejected" && req.body.reason) {
      story.rejectionReason = req.body.reason;
    }

    await story.save();

    res.json(story);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Không tìm thấy truyện" });
    }
    res.status(500).send("Server Error");
  }
});

// @route   GET api/stories/admin/list
// @desc    Get all stories for admin (includes all statuses)
// @access  Admin
router.get("/admin/list", async (req, res) => {
  try {
    console.log("Processing API request for admin story list");

    // For the dropdown we only need basic story information, no need for pagination
    // or complex filtering - just get all stories sorted by title
    const stories = await Story.find()
      .select("_id title author")
      .sort({ title: 1 })
      .lean();

    console.log(`Found ${stories.length} stories for admin dropdown`);

    // Return in the format expected by the client (success flag + stories array)
    return res.json({
      success: true,
      stories,
    });
  } catch (err) {
    console.error("Error in admin story list endpoint:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
});

// @route   POST api/stories/:id/chapters-debug
// @desc    Add a new chapter to a story (DEBUG route - no auth)
// @access  Public (temporary)
router.post("/:id/chapters-debug", async (req, res) => {
  try {
    console.log("DEBUG: Creating new chapter for story:", req.params.id);
    console.log("DEBUG: Request body:", req.body);

    const { title, content, number, isVIP = false, coinPrice = 0 } = req.body;
    const storyId = req.params.id;

    // Basic validation
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng điền đầy đủ thông tin chương",
      });
    }

    // Verify story exists
    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy truyện",
      });
    }

    console.log("DEBUG: Story found:", story.title);

    // Find the highest chapter number if not provided
    let chapterNumber = number;
    if (!chapterNumber) {
      const highestChapter = await Chapter.findOne({ story: storyId })
        .sort({ number: -1 })
        .select("number");

      chapterNumber = highestChapter ? highestChapter.number + 1 : 1;
    }

    // Create new chapter
    const newChapter = new Chapter({
      story: storyId,
      title,
      content,
      number: chapterNumber,
      isFree: !isVIP,
      coinPrice: isVIP ? coinPrice : 0,
      author: "admin", // Hard-coded for debug
      status: "published", // Use "published" which is valid in the schema
    });

    // Save chapter
    console.log("DEBUG: Saving chapter...");
    await newChapter.save();
    console.log("DEBUG: Chapter saved successfully");

    // Update story's updatedAt
    story.updatedAt = Date.now();
    await story.save();

    console.log("DEBUG: Chapter created successfully:", newChapter._id);

    res.json({
      success: true,
      message: "Thêm chương mới thành công. Chương đã được xuất bản.",
      data: newChapter,
    });
  } catch (err) {
    console.error("DEBUG ERROR creating chapter:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi tạo chương mới",
      error: err.message,
      stack: err.stack,
    });
  }
});

// @route   POST api/stories/:id/views
// @desc    Increment story views
// @access  Public
router.post("/:id/views", async (req, res) => {
  try {
    const storyId = req.params.id;

    // Validate story ID
    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return res.status(400).json({
        success: false,
        message: "ID truyện không hợp lệ",
      });
    }

    // Tăng lượt xem trong Story
    const story = await Story.findByIdAndUpdate(
      storyId,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy truyện",
      });
    }

    // Lấy ngày hiện tại (chỉ lấy ngày, bỏ giờ phút giây)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Tìm hoặc tạo bản ghi lượt xem cho ngày hôm nay
    await StoryView.findOneAndUpdate(
      {
        story: storyId,
        date: today,
      },
      {
        $inc: { views: 1 },
      },
      {
        upsert: true, // Tạo mới nếu không tồn tại
        new: true,
      }
    );

    res.json({
      success: true,
      views: story.views,
    });
  } catch (error) {
    console.error("Error incrementing views:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tăng lượt xem",
    });
  }
});

// @route   POST api/stories/:id/rate
// @desc    Rate a story (One time only per user)
// @access  Private
router.post("/:id/rate", auth.verifyToken, async (req, res) => {
  console.log(
    `Received rating request for story ${req.params.id} by user ${req.user?.id}`
  );
  try {
    const { rating } = req.body;
    const storyId = req.params.id;

    if (!req.user || !req.user.id) {
      console.error("RATE API ERROR: User ID not found in req.user");
      return res
        .status(401)
        .json({ success: false, message: "Lỗi xác thực người dùng." });
    }
    const userId = req.user.id;

    const numericRating = Number(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 10) {
      console.error(`RATE API ERROR: Invalid rating value received: ${rating}`);
      return res.status(400).json({
        success: false,
        message: "Đánh giá phải là số từ 1 đến 10",
      });
    }

    // --- START: Check if user already rated ---
    const existingRating = await Rating.findOne({
      story: storyId,
      user: userId,
    });
    if (existingRating) {
      console.log(`User ${userId} already rated story ${storyId}.`);
      return res
        .status(403)
        .json({ success: false, message: "Bạn đã đánh giá truyện này rồi." });
    }
    // --- END: Check if user already rated ---

    const story = await Story.findById(storyId);
    if (!story) {
      console.error(`RATE API ERROR: Story not found with ID: ${storyId}`);
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy truyện",
      });
    }

    // Create NEW rating (since we checked existing above)
    console.log(`Creating new rating for story ${storyId} by user ${userId}`);
    const newRating = new Rating({
      story: storyId,
      user: userId,
      rating: numericRating,
    });
    await newRating.save();
    console.log(
      `Rating saved successfully for story ${storyId} by user ${userId}`
    );

    // Calculate new average rating
    const ratings = await Rating.find({ story: storyId });
    const ratingCount = ratings.length;
    const ratingSum = ratings.reduce((sum, item) => sum + item.rating, 0);
    const averageRating = ratingCount > 0 ? ratingSum / ratingCount : 0;
    console.log(
      `Calculated new average rating for story ${storyId}: ${averageRating} from ${ratingCount} ratings`
    );

    // Update story document with rating stats
    if (!story.rating) {
      console.warn(`Story ${storyId} missing rating object, initializing.`);
      story.rating = { average: 0, count: 0 };
    }
    story.rating.average = averageRating;
    story.rating.count = ratingCount;
    await story.save();
    console.log(`Story ${storyId} updated successfully with new rating info.`);

    res.json({
      success: true,
      averageRating, // Average rating of the story
      ratingCount, // Total number of ratings for the story
      userRating: numericRating, // The rating submitted by THIS user in THIS request
      message: "Đánh giá thành công",
    });
  } catch (err) {
    console.error(
      `RATE API CRITICAL ERROR for story ${req.params.id} by user ${req.user?.id}:`,
      err
    );
    // Check for duplicate key error specifically (though the check above should prevent it)
    if (err.code === 11000) {
      return res.status(409).json({
        // 409 Conflict might be more appropriate
        success: false,
        message: "Lỗi: Có vẻ bạn đã đánh giá truyện này rồi.",
        error: process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
    res.status(500).json({
      success: false,
      message: "Lỗi server khi xử lý đánh giá. Vui lòng thử lại sau.",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// @route   GET api/stories/:id/ratings
// @desc    Get ratings for a story
// @access  Public
router.get("/:id/ratings", async (req, res) => {
  try {
    const storyId = req.params.id;

    // Check if story exists
    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy truyện",
      });
    }

    // Get all ratings for this story
    const ratings = await Rating.find({ story: storyId })
      .populate("user", "username avatar")
      .sort({ createdAt: -1 });

    // Calculate statistics
    const ratingCount = ratings.length;
    const ratingSum = ratings.reduce((sum, item) => sum + item.rating, 0);
    const averageRating = ratingCount > 0 ? ratingSum / ratingCount : 0;

    // Return ratings and statistics
    res.json({
      success: true,
      ratings,
      stats: {
        average: averageRating,
        count: ratingCount,
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
});

// @route   GET api/stories/:id/my-rating
// @desc    Get the current logged-in user's rating for a specific story
// @access  Private
router.get("/:id/my-rating", auth.verifyToken, async (req, res) => {
  try {
    const storyId = req.params.id;

    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ success: false, message: "Lỗi xác thực người dùng." });
    }
    const userId = req.user.id;

    const userRating = await Rating.findOne({
      story: storyId,
      user: userId,
    }).select("rating"); // Chỉ lấy trường rating

    if (userRating) {
      res.json({ success: true, rated: true, rating: userRating.rating });
    } else {
      res.json({ success: true, rated: false, rating: null });
    }
  } catch (err) {
    console.error(
      `GET MY-RATING API ERROR for story ${req.params.id} by user ${req.user?.id}:`,
      err
    );
    res.status(500).json({
      success: false,
      message: "Lỗi server khi kiểm tra đánh giá của bạn.",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// @route   GET api/stories/:id/check-rating
// @desc    Check if story ratings need syncing
// @access  Private (only logged in users)
router.get("/:id/check-rating", auth.verifyToken, async (req, res) => {
  try {
    const storyId = req.params.id;

    // Kiểm tra ID hợp lệ
    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return res.status(400).json({
        success: false,
        message: "ID truyện không hợp lệ",
      });
    }

    // Đếm số lượng đánh giá cho truyện này
    const ratingsCount = await Rating.countDocuments({ story: storyId });

    // Lấy thông tin hiện tại của truyện
    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy truyện",
      });
    }

    // Kiểm tra đánh giá của người dùng hiện tại
    const userRating = await Rating.findOne({
      story: storyId,
      user: req.userId,
    });

    // Kiểm tra nếu cần đồng bộ
    let needSync = false;
    let shouldResetRating = false;

    // Nếu không có đánh giá nào nhưng story.rating > 0
    if (ratingsCount === 0 && story.rating && story.rating.count > 0) {
      needSync = true;
      shouldResetRating = true;
    }

    // Hoặc nếu có đánh giá nhưng story.rating = 0
    if (ratingsCount > 0 && (!story.rating || story.rating.count === 0)) {
      needSync = true;
      shouldResetRating = false;
    }

    res.json({
      success: true,
      storyId: storyId,
      currentRating: story.rating || { average: 0, count: 0 },
      actualRatingsCount: ratingsCount,
      hasUserRated: !!userRating,
      userRating: userRating ? userRating.rating : null,
      needSync,
      shouldResetRating,
    });
  } catch (err) {
    console.error("Error checking rating:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi kiểm tra đánh giá",
    });
  }
});

// @route   POST api/stories/:id/update-rating
// @desc    Directly update rating for a story (admin & moderator only)
// @access  Private (admin/moderator)
router.post("/:id/update-rating", auth.verifyToken, async (req, res) => {
  try {
    const storyId = req.params.id;
    const { average, count } = req.body;

    // Kiểm tra quyền admin hoặc moderator
    const user = await User.findById(req.userId);
    if (!user || (user.role !== "admin" && user.role !== "moderator")) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền cập nhật đánh giá",
      });
    }

    // Kiểm tra ID hợp lệ
    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return res.status(400).json({
        success: false,
        message: "ID truyện không hợp lệ",
      });
    }

    // Cập nhật truyện
    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy truyện",
      });
    }

    // Cập nhật đánh giá
    story.rating = {
      average: Number(average) || 0,
      count: Number(count) || 0,
    };

    await story.save();

    res.json({
      success: true,
      message: "Đã cập nhật đánh giá truyện",
      rating: story.rating,
    });
  } catch (err) {
    console.error("Error updating rating:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật đánh giá",
    });
  }
});

// @route   POST api/stories/:id/recalculate-rating
// @desc    Recalculate rating based on ratings collection
// @access  Private (logged in users can recalculate for stories they rated)
router.post("/:id/recalculate-rating", auth.verifyToken, async (req, res) => {
  try {
    const storyId = req.params.id;

    // Kiểm tra ID hợp lệ
    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return res.status(400).json({
        success: false,
        message: "ID truyện không hợp lệ",
      });
    }

    // Kiểm tra truyện tồn tại
    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy truyện",
      });
    }

    // Lấy tất cả đánh giá cho truyện này
    const ratings = await Rating.find({ story: storyId });

    // Tính điểm trung bình
    let average = 0;
    const count = ratings.length;

    if (count > 0) {
      const sum = ratings.reduce((acc, rating) => acc + rating.rating, 0);
      average = sum / count;
    }

    // Cập nhật đánh giá
    story.rating = { average, count };
    await story.save();

    res.json({
      success: true,
      message: "Đã tính lại đánh giá truyện",
      rating: story.rating,
    });
  } catch (err) {
    console.error("Error recalculating rating:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi tính lại đánh giá",
    });
  }
});

// @route   POST api/stories/:id/follow
// @desc    Toggle follow story with detailed story info
// @access  Private
router.post("/:id/follow", auth.isAuth, async (req, res) => {
  try {
    const storyId = req.params.id;
    const userId = req.userId;

    // Kiểm tra ID hợp lệ
    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return res.status(400).json({
        success: false,
        message: "ID truyện không hợp lệ",
      });
    }

    // Tìm user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Người dùng không tồn tại",
      });
    }

    // Kiểm tra xem truyện có tồn tại không
    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Truyện không tồn tại",
      });
    }

    // Lấy thông tin chi tiết từ client
    const storyInfo = req.body.storyInfo || {};

    // Kiểm tra xem user đã follow truyện này chưa
    const isFollowing =
      user.followedStories &&
      user.followedStories.some(
        (item) => item.storyId && item.storyId.toString() === storyId
      );

    if (isFollowing) {
      // Nếu đã follow rồi thì unfollow
      await User.findByIdAndUpdate(userId, {
        $pull: { followedStories: { storyId: storyId } },
      });

      res.json({
        success: true,
        following: false,
        message: "Đã bỏ theo dõi truyện",
      });
    } else {
      // Nếu chưa follow thì thêm vào danh sách theo dõi với thông tin chi tiết
      const followedStoryInfo = {
        storyId: storyId,
        title: storyInfo.title || story.title,
        author: storyInfo.author || story.author,
        coverImage: storyInfo.coverImage || story.coverImage,
        status: storyInfo.status || story.status,
        latestChapters: storyInfo.latestChapters || [],
        followedAt: new Date(),
      };

      await User.findByIdAndUpdate(userId, {
        $push: { followedStories: followedStoryInfo },
      });

      res.json({
        success: true,
        following: true,
        message: "Đã theo dõi truyện",
      });
    }
  } catch (err) {
    console.error("Error toggling follow:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi theo dõi truyện",
    });
  }
});

// @route   POST api/stories/:id/unfollow
// @desc    Unfollow story
// @access  Private
router.post("/:id/unfollow", auth.isAuth, async (req, res) => {
  try {
    const storyId = req.params.id;
    const userId = req.userId;

    // Kiểm tra ID hợp lệ
    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return res.status(400).json({
        success: false,
        message: "ID truyện không hợp lệ",
      });
    }

    // Tìm user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Người dùng không tồn tại",
      });
    }

    // Kiểm tra xem user đã follow truyện này chưa
    const isFollowing =
      user.followedStories &&
      user.followedStories.some(
        (item) => item.storyId && item.storyId.toString() === storyId
      );

    if (!isFollowing) {
      return res.status(400).json({
        success: false,
        message: "Bạn chưa theo dõi truyện này",
      });
    }

    // Bỏ theo dõi truyện
    await User.findByIdAndUpdate(userId, {
      $pull: { followedStories: { storyId: storyId } },
    });

    res.json({
      success: true,
      message: "Đã bỏ theo dõi truyện",
    });
  } catch (err) {
    console.error("Error unfollowing story:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi bỏ theo dõi truyện",
    });
  }
});

// @route   GET api/stories/:id/check-follow
// @desc    Check if user is following a story
// @access  Private
router.get("/:id/check-follow", auth.isAuth, async (req, res) => {
  try {
    const storyId = req.params.id;
    const userId = req.userId;

    // Kiểm tra ID hợp lệ
    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return res.status(400).json({
        success: false,
        message: "ID truyện không hợp lệ",
      });
    }

    // Tìm user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Người dùng không tồn tại",
      });
    }

    // Kiểm tra xem user có theo dõi truyện không
    const isFollowing =
      user.followedStories &&
      user.followedStories.some(
        (item) => item.storyId && item.storyId.toString() === storyId
      );

    res.json({
      success: true,
      following: isFollowing,
    });
  } catch (err) {
    console.error("Error checking follow status:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi kiểm tra trạng thái theo dõi",
    });
  }
});

// @route   GET api/stories/list-titles
// @desc    Get a list of all story IDs and titles
// @access  Public (or Private if needed)
router.get("/list-titles", async (req, res) => {
  try {
    const stories = await Story.find()
      .select("title") // Select only title (and _id by default)
      .sort({ title: 1 }) // Sort alphabetically by title
      .lean();
    res.json({ success: true, stories });
  } catch (err) {
    console.error("Error fetching story list:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server khi lấy danh sách truyện" });
  }
});

// Tăng lượt xem truyện
router.post("/:storyId/increment-views", async (req, res) => {
  try {
    const story = await Story.findByIdAndUpdate(
      req.params.storyId,
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!story) {
      return res.status(404).json({ message: "Truyện không tồn tại" });
    }
    res.json({ views: story.views });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Tăng lượt xem chương
router.post(
  "/:storyId/chapters/:chapterId/increment-views",
  async (req, res) => {
    try {
      const chapter = await Chapter.findByIdAndUpdate(
        req.params.chapterId,
        { $inc: { views: 1 } },
        { new: true }
      );
      if (!chapter) {
        return res.status(404).json({ message: "Chương không tồn tại" });
      }
      res.json({ views: chapter.views });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server" });
    }
  }
);

// @route   POST api/stories/:id/increment-views
// @desc    Increment story views
// @access  Public
router.post("/:id/increment-views", async (req, res) => {
  try {
    // Validate story ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "ID truyện không hợp lệ",
      });
    }

    const storyId = req.params.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Đặt giờ về 00:00:00

    // Tăng lượt xem trong Story
    const story = await Story.findByIdAndUpdate(
      storyId,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy truyện",
      });
    }

    // Lưu lượt xem vào StoryView
    await StoryView.findOneAndUpdate(
      { story: storyId, date: today },
      { $inc: { views: 1 } },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      views: story.views,
    });
  } catch (err) {
    console.error("Error incrementing story views:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi tăng lượt xem truyện",
    });
  }
});

// @route   POST api/stories/:storyId/chapters/:chapterId/increment-views
// @desc    Increment chapter views
// @access  Public
router.post(
  "/:storyId/chapters/:chapterId/increment-views",
  async (req, res) => {
    try {
      // Validate chapter ID
      if (!mongoose.Types.ObjectId.isValid(req.params.chapterId)) {
        return res.status(400).json({
          success: false,
          message: "ID chương không hợp lệ",
        });
      }

      const chapter = await Chapter.findByIdAndUpdate(
        req.params.chapterId,
        { $inc: { views: 1 } },
        { new: true }
      );

      if (!chapter) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy chương",
        });
      }

      res.json({
        success: true,
        views: chapter.views,
      });
    } catch (err) {
      console.error("Error incrementing chapter views:", err);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi tăng lượt xem chương",
      });
    }
  }
);

// Get top stories by views within a time period
router.get("/top", async (req, res) => {
  try {
    const { period = "day" } = req.query;
    let startDate = new Date();

    // Calculate start date based on period
    switch (period) {
      case "day":
        startDate.setDate(startDate.getDate() - 1);
        break;
      case "week":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "year":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 1); // Default to day
    }

    // Find stories with views within the time period
    const stories = await Story.aggregate([
      {
        $match: {
          status: { $in: ["ongoing", "completed", "paused"] },
          createdAt: { $gte: startDate },
        },
      },
      {
        $lookup: {
          from: "genres",
          localField: "genres",
          foreignField: "_id",
          as: "genreDetails",
        },
      },
      {
        $lookup: {
          from: "chapters",
          localField: "_id",
          foreignField: "story",
          as: "chapters",
        },
      },
      {
        $addFields: {
          chapterCount: { $size: "$chapters" },
          views: { $ifNull: ["$views", 0] },
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          author: 1,
          description: 1,
          coverImage: 1,
          status: 1,
          views: 1,
          chapterCount: 1,
          genres: "$genreDetails",
          createdAt: 1,
          updatedAt: 1,
        },
      },
      {
        $sort: { views: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    res.json({
      success: true,
      stories: stories.map((story) => ({
        ...story,
        genres: story.genres.map((genre) => ({
          _id: genre._id,
          name: genre.name,
        })),
      })),
    });
  } catch (error) {
    console.error("Error fetching top stories:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách truyện top",
    });
  }
});

module.exports = router;
