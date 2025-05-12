const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const auth = require("../../middleware/auth");
const adminAuth = require("../../middleware/adminAuth");
const Chapter = require("../../models/Chapter");
const Story = require("../../models/Story");
const Transaction = require("../../models/Transaction");
const User = require("../../models/User");
const jwt = require("jsonwebtoken");

// Helper function to map status for frontend consistency
const mapStatus = (chap) => {
  if (!chap) return null;
  // Clone to avoid modifying the original lean object if reused
  const mappedChap = { ...chap };
  mappedChap.status =
    mappedChap.status === "published" ? "approved" : mappedChap.status;
  return mappedChap;
};

// @route   GET api/chapters/:id
// @desc    Get chapter by ID
// @access  Public (content may be restricted)
router.get("/:id", async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.id)
      .populate("story", "title _id author userId coverImage")
      .lean();

    if (!chapter) {
      return res
        .status(404)
        .json({ success: false, msg: "Không tìm thấy chương" });
    }

    // Check if user is logged in and is admin/author
    let isAdmin = false;
    let isUserAuthor = false;
    let userId = null; // Variable to store user ID if logged in
    let hasUserPurchased = false;

    // Try to get user ID from token if present
    const authHeader = req.header("Authorization");
    const token = authHeader?.split(" ")[1]; // Check Authorization header
    console.log(
      "Chapter GET: Authorization Header:",
      authHeader ? "Present" : "Missing"
    );
    console.log("Chapter GET: Token found?", !!token);

    if (token) {
      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "your_jwt_secret"
        );
        userId = decoded.id; // Get user ID from token payload
        console.log("Chapter GET: Decoded userId:", userId);

        // Fetch user data to check role (assuming User model has 'role')
        const user = await User.findById(userId).select("role").lean(); // Fetch only the role
        if (user) {
          console.log("Chapter GET: Found user data:", user);
          isAdmin = user.role === "admin";
          // Ensure chapter.story and chapter.story.userId exist before comparison
          isUserAuthor =
            chapter.story &&
            chapter.story.userId &&
            userId ===
              (chapter.story.userId ? chapter.story.userId.toString() : null);
          console.log(
            `Chapter GET: isAdmin=${isAdmin}, isUserAuthor=${isUserAuthor} (Story Author: ${chapter.story?.userId})`
          );

          // If not free and not author/admin, check if user has purchased this chapter
          if (!chapter.isFree && !isAdmin && !isUserAuthor) {
            const transaction = await Transaction.findOne({
              user: userId,
              "use.target": "chapter",
              "use.targetId": chapter._id,
              status: "completed",
            });
            hasUserPurchased = !!transaction;
            console.log(
              `Chapter GET: Purchase check for user ${userId}: hasUserPurchased=${hasUserPurchased}`
            );
          }
        } else {
          console.log("Chapter GET: User not found for ID:", userId);
          // Treat as guest if user lookup fails despite valid token
          userId = null;
          isAdmin = false;
          isUserAuthor = false;
        }
      } catch (error) {
        // Token invalid or other error during verification/user fetch
        console.error(
          "Chapter GET: Token/User validation error:",
          error.message
        );
        userId = null; // Ensure userId is null if validation fails
        isAdmin = false;
        isUserAuthor = false;
      }
    } else {
      console.log(
        "Chapter GET: No Authorization token provided. Proceeding as guest."
      );
    }

    // --- Access Control Checks ---

    // 1. Check Approval Status (Skip for Admin/Author)
    console.log(
      `Chapter GET: Checking status approval. Chapter status: ${chapter.status}, isAdmin: ${isAdmin}, isUserAuthor: ${isUserAuthor}`
    );
    if (chapter.status !== "published" && !isAdmin && !isUserAuthor) {
      console.log(
        "Chapter GET: Access denied. Chapter not published and user is not admin/author."
      );
      // Return 403 with specific message
      return res
        .status(403)
        .json({ success: false, msg: "Chương này chưa được phê duyệt" });
    }
    console.log(
      "Chapter GET: Access granted (published or user is admin/author). Proceeding..."
    );

    // 2. Check Payment Status (Skip for Free chapters, Admin, Author)
    if (!chapter.isFree && !isAdmin && !isUserAuthor && !hasUserPurchased) {
      console.log("Chapter GET: Access denied. Chapter requires purchase.");
      // Get the settings for chapter price
      const settings = await mongoose.model("Setting").findOne({});
      const defaultPrice = settings?.coins?.defaultChapterPrice || 5;

      // Return limited data with purchase info (Status 200 but indicates lock)
      return res.json({
        success: true, // Indicate successful retrieval of *status*
        data: {
          chapter: {
            _id: chapter._id,
            title: chapter.title,
            number: chapter.number,
            isFree: chapter.isFree,
            status: chapter.status,
            preview: chapter.content.substring(0, 500) + "...", // First 500 characters as preview
            isLocked: true, // Explicitly indicate lock
            price: defaultPrice,
            coinPrice: chapter.coinPrice,
          },
          story: chapter.story, // Include story info for context
          isPurchased: false,
          isAuthor: false, // Since we are in this block
          isAdmin: false,
        },
      });
    }
    console.log(
      `Chapter GET: Access granted. isFree=${chapter.isFree}, isAdmin=${isAdmin}, isUserAuthor=${isUserAuthor}, hasUserPurchased=${hasUserPurchased}`
    );

    // --- Prepare Full Response ---
    // Fetch previous/next chapters (only if access is granted)
    console.log(
      `Chapter GET: Fetching adjacent chapters for story ${chapter.story._id}`
    );
    const storyChapters = await Chapter.find({
      story: chapter.story._id,
      status: "published", // Ensure only published chapters are considered for navigation
    })
      .sort({ number: 1 }) // Sort by chapter number ASCENDING (1, 2, 3...)
      .select("_id number title status createdAt") // Keep necessary fields
      .lean(); // Use lean for performance

    console.log(
      `Chapter GET: Found ${storyChapters.length} chapters for the story.`
    );

    // Find the index of the CURRENT chapter in the sorted list
    const currentIndex = storyChapters.findIndex(
      (c) => c._id && chapter._id && c._id.toString() === chapter._id.toString()
    );
    console.log(`Chapter GET: Current chapter index: ${currentIndex}`);

    // Since we sort by number ASC (1, 2, 3...), the "prev" chapter is the one before it in the array
    // and the "next" chapter is the one after it in the array.
    const prevChapterData =
      currentIndex > 0 ? storyChapters[currentIndex - 1] : null;
    const nextChapterData =
      currentIndex < storyChapters.length - 1
        ? storyChapters[currentIndex + 1]
        : null;

    // Filter adjacent chapters to only return published ones for the links
    const publishedPrevChapter =
      prevChapterData && prevChapterData.status === "published" // Check for "published"
        ? prevChapterData
        : null;
    const publishedNextChapter =
      nextChapterData && nextChapterData.status === "published" // Check for "published"
        ? nextChapterData
        : null;

    console.log(
      "Chapter GET: Determined adjacent chapters (published check):",
      {
        prev: publishedPrevChapter,
        next: publishedNextChapter,
      }
    );

    // Return full chapter data
    console.log("Chapter GET: Returning full chapter data.");

    // Check if chapter is saved by user
    let isSaved = false;
    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        isSaved = user.savedChapters.some(
          (saved) =>
            saved.chapter &&
            chapter._id &&
            saved.chapter.toString() === chapter._id.toString()
        );
      }
    }

    res.json({
      success: true,
      data: {
        // Map current chapter status for consistency
        chapter: {
          ...mapStatus(chapter),
          content: chapter.content,
          isLocked: false,
          isSaved: isSaved,
        },
        story: chapter.story,
        // Map adjacent chapter status for consistency
        prevChapter: mapStatus(publishedPrevChapter),
        nextChapter: mapStatus(publishedNextChapter),
        isPurchased: hasUserPurchased,
        isAuthor: isUserAuthor,
        isAdmin: isAdmin,
      },
    });
  } catch (err) {
    console.error("Chapter GET: General Error:", err);
    if (err.kind === "ObjectId") {
      return res
        .status(404)
        .json({ success: false, msg: "Không tìm thấy chương" });
    }
    res.status(500).json({
      success: false,
      msg: "Lỗi server khi tải chương",
      error: err.message,
    });
  }
});

// @route   POST api/chapters/purchase/:id
// @desc    Purchase a chapter
// @access  Private
router.post("/purchase/:id", auth.verifyToken, async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.id)
      .populate("story", "title author userId")
      .lean();

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy chương",
      });
    }

    // Check if chapter is already free
    if (chapter.isFree) {
      return res.status(400).json({
        success: false,
        message: "Chương này đã miễn phí",
      });
    }

    // Check if the user is the author or admin
    const isUserAuthor =
      (chapter.author && req.user.id === chapter.author.toString()) ||
      (chapter.story.userId &&
        req.user.id === chapter.story.userId.toString()) ||
      req.user.isAdmin;

    if (isUserAuthor) {
      return res.status(400).json({
        success: false,
        message: "Bạn là tác giả không cần mua chương này",
      });
    }

    // Check if the user has already purchased this chapter
    const existingTransaction = await Transaction.findOne({
      user: req.user.id,
      "use.target": "chapter",
      "use.targetId": chapter._id,
      status: "completed",
    });

    if (existingTransaction) {
      return res.status(400).json({
        success: false,
        message: "Bạn đã mua chương này rồi",
      });
    }

    // Get the settings for chapter price
    let chapterPrice = chapter.coinPrice;
    if (!chapterPrice || isNaN(chapterPrice)) {
      const settings = await mongoose.model("Setting").findOne({});
      chapterPrice = settings?.coins?.defaultChapterPrice || 5;
    }

    // Get user
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin người dùng",
      });
    }

    // Check if user has enough coins
    if (user.coins < chapterPrice) {
      return res.status(400).json({
        success: false,
        message: "Bạn không đủ xu để mua chương này",
      });
    }

    // Create transaction
    const transaction = new Transaction({
      user: req.user.id,
      type: "usage",
      coins: chapterPrice,
      status: "completed",
      use: {
        target: "chapter",
        targetId: chapter._id,
        info: `${chapter.story.title} - ${chapter.title}`,
      },
    });

    // Deduct coins from user
    user.coins -= chapterPrice;

    // Save transaction and update user
    await transaction.save();
    await user.save();

    // Return success
    res.json({
      success: true,
      message: "Đã mua chương thành công",
      transaction,
      remainingCoins: user.coins,
    });
  } catch (err) {
    console.error("Error purchasing chapter:", err);
    if (err.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy chương",
      });
    }
    res.status(500).json({
      success: false,
      message: "Lỗi server khi mua chương",
      error: err.message,
    });
  }
});

// @route   PUT api/chapters/:id
// @desc    Update a chapter
// @access  Private
router.put("/:id", auth.verifyToken, async (req, res) => {
  try {
    const { title, content, isFree, number } = req.body;

    // Get chapter
    const chapter = await Chapter.findById(req.params.id);

    if (!chapter) {
      return res.status(404).json({ msg: "Không tìm thấy chương" });
    }

    // Get story to check ownership
    const story = await Story.findById(chapter.story);

    if (!story) {
      return res.status(404).json({ msg: "Không tìm thấy truyện" });
    }

    // Check if user is authorized to update
    if (
      story.userId.toString() !== req.user.id &&
      chapter.author.toString() !== req.user.id &&
      !req.user.isAdmin
    ) {
      return res
        .status(401)
        .json({ msg: "Không có quyền cập nhật chương này" });
    }

    // Update fields
    if (title) chapter.title = title;
    if (content) chapter.content = content;

    // Only author or admin can change chapter number and free status
    if (
      (story.userId.toString() === req.user.id || req.user.isAdmin) &&
      isFree !== undefined
    ) {
      chapter.isFree = isFree === "true" || isFree === true;
    }

    if (
      (story.userId.toString() === req.user.id || req.user.isAdmin) &&
      number
    ) {
      chapter.number = number;
    }

    // If user is not admin, set status back to pending
    if (!req.user.isAdmin && chapter.status === "approved") {
      chapter.status = "pending";
    }

    // Save chapter
    await chapter.save();

    // Update story's updatedAt
    story.updatedAt = Date.now();
    await story.save();

    res.json(chapter);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Không tìm thấy chương" });
    }
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// @route   DELETE api/chapters/:id
// @desc    Delete a chapter
// @access  Private
router.delete("/:id", auth.verifyToken, async (req, res) => {
  try {
    console.log("--- BẮT ĐẦU XÓA CHƯƠNG ---");
    console.log("Chapter ID:", req.params.id);
    const chapter = await Chapter.findById(req.params.id);
    if (!chapter) {
      console.log("Không tìm thấy chương");
      return res.status(404).json({ msg: "Không tìm thấy chương" });
    }
    console.log("Tìm thấy chương:", chapter._id);
    // Get story to check ownership
    const story = await Story.findById(chapter.story);
    if (!story) {
      console.log("Không tìm thấy truyện");
      return res.status(404).json({ msg: "Không tìm thấy truyện" });
    }
    console.log("Tìm thấy truyện:", story._id);
    // Check if user is authorized to delete
    try {
      console.log(
        "Check quyền xóa:",
        story.userId,
        chapter.author,
        req.user.id,
        req.user.isAdmin
      );
      if (req.user.isAdmin) {
        console.log("Là admin, cho phép xóa chương này");
      } else {
        const isOwner = story.userId && story.userId.toString() === req.user.id;
        const isAuthor =
          chapter.author && chapter.author.toString() === req.user.id;
        if (!isOwner && !isAuthor) {
          console.log("Không có quyền xóa chương này");
          return res.status(401).json({ msg: "Không có quyền xóa chương này" });
        }
      }
    } catch (err) {
      console.error("Lỗi khi kiểm tra quyền xóa:", err);
      return res.status(500).json({
        success: false,
        message: "Lỗi kiểm tra quyền xóa",
        error: err.message,
      });
    }
    // Delete the chapter
    try {
      await Chapter.deleteOne({ _id: chapter._id });
      console.log("Đã xóa chương:", chapter._id);
    } catch (err) {
      console.error("Lỗi khi xóa chương:", err);
      return res.status(500).json({
        success: false,
        message: "Lỗi khi xóa chương",
        error: err.message,
      });
    }
    // Xóa chương khỏi danh sách savedChapters của tất cả user
    try {
      await User.updateMany(
        { "savedChapters.chapter": chapter._id },
        { $pull: { savedChapters: { chapter: chapter._id } } }
      );
      console.log("Đã xóa chương khỏi savedChapters của user");
    } catch (err) {
      console.error("Lỗi khi xóa savedChapters:", err);
      return res.status(500).json({
        success: false,
        message: "Lỗi khi xóa savedChapters",
        error: err.message,
      });
    }
    // Update story's updatedAt
    try {
      story.updatedAt = Date.now();
      await story.save();
      console.log("Đã cập nhật updatedAt cho truyện:", story._id);
    } catch (err) {
      console.error("Lỗi khi cập nhật updatedAt cho truyện:", err);
      return res.status(500).json({
        success: false,
        message: "Lỗi khi cập nhật updatedAt cho truyện",
        error: err.message,
      });
    }
    res.json({ success: true, msg: "Đã xóa chương thành công" });
    console.log("--- KẾT THÚC XÓA CHƯƠNG ---");
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Không tìm thấy chương" });
    }
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// @route   PUT api/chapters/approve/:id
// @desc    Approve a chapter (admin only)
// @access  Admin
router.put("/approve/:id", async (req, res) => {
  try {
    console.log("Approving chapter with ID:", req.params.id);

    // TẠMTHỜI: Bỏ qua kiểm tra admin trong giai đoạn phát triển
    // Trong môi trường production, cần bật lại middleware adminAuth

    const chapter = await Chapter.findById(req.params.id);

    if (!chapter) {
      return res.status(404).json({ msg: "Không tìm thấy chương" });
    }

    // Update status to "published" (which is the valid status in the schema)
    // instead of "approved" (which is used in the frontend)
    chapter.status = "published";

    // Save chapter
    await chapter.save();

    // Get story to update timestamp
    const story = await Story.findById(chapter.story);
    if (story) {
      story.updatedAt = Date.now();
      await story.save();
    }

    // Map back to "approved" for the frontend
    const responseChapter = chapter.toObject();
    responseChapter.status = "approved";

    res.json(responseChapter);
  } catch (err) {
    console.error("Error approving chapter:", err);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Không tìm thấy chương" });
    }
    res.status(500).json({
      msg: "Lỗi server khi duyệt chương",
      error: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
});

// @route   PUT api/chapters/reject/:id
// @desc    Reject a chapter (admin only)
// @access  Admin
router.put("/reject/:id", async (req, res) => {
  try {
    // TẠMTHỜI: Bỏ qua kiểm tra admin trong giai đoạn phát triển
    // Trong môi trường production, cần bật lại middleware adminAuth

    const { reason } = req.body;

    const chapter = await Chapter.findById(req.params.id);

    if (!chapter) {
      return res.status(404).json({ msg: "Không tìm thấy chương" });
    }

    // Update status and add rejection reason
    chapter.status = "rejected";
    chapter.rejectReason = reason || "";

    // Save chapter
    await chapter.save();

    res.json(chapter);
  } catch (err) {
    console.error("Error rejecting chapter:", err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Không tìm thấy chương" });
    }
    res.status(500).json({ msg: "Lỗi server khi từ chối chương" });
  }
});

// @route   GET api/chapters/admin/pending
// @desc    Get all pending chapters for admin
// @access  Admin
router.get("/admin/pending", adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    let filter = { status: "pending" };

    // Filter by story if provided
    if (req.query.story) {
      filter.story = new mongoose.Types.ObjectId(req.query.story);
    }

    // Filter by search term if provided
    if (req.query.search) {
      filter.$or = [{ title: { $regex: req.query.search, $options: "i" } }];
    }

    // Count total pending chapters
    const total = await Chapter.countDocuments(filter);

    // Get chapters
    const chapters = await Chapter.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("story", "title")
      .lean();

    res.json({
      chapters,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// @route   GET api/chapters/user
// @desc    Get all chapters by current user
// @access  Private
router.get("/user/list", auth.verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {
      author: req.user.id,
    };

    // Filter by status if provided
    if (req.query.status && req.query.status !== "all") {
      filter.status = req.query.status;
    }

    // Count total user chapters
    const total = await Chapter.countDocuments(filter);

    // Get chapters
    const chapters = await Chapter.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("story", "title")
      .lean();

    res.json({
      chapters,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// @route   GET api/chapters/admin/list
// @desc    Get all chapters for admin
// @access  Admin
router.get("/admin/list", async (req, res) => {
  try {
    console.log("Admin chapter list API called with params:", req.query);

    // TẠMTHỜI: Bỏ qua kiểm tra admin trong giai đoạn phát triển
    // Trong môi trường production, cần bật lại middleware adminAuth

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    let filter = {};

    // Filter by status if provided and not "all"
    if (req.query.status && req.query.status !== "all") {
      // Handle the status inconsistency: map 'approved' to 'published'
      if (req.query.status === "approved") {
        filter.status = "published";
      } else {
        filter.status = req.query.status;
      }
    }

    // Filter by story if provided
    if (req.query.story) {
      filter.story = new mongoose.Types.ObjectId(req.query.story);
    }

    // Filter by search term if provided
    if (req.query.search) {
      filter.$or = [{ title: { $regex: req.query.search, $options: "i" } }];
    }

    console.log("MongoDB filter:", filter);

    // Count total chapters that match the filter
    const total = await Chapter.countDocuments(filter);

    // Get chapters
    const chapters = await Chapter.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("story", "title")
      .lean();

    console.log(`Found ${chapters.length} chapters for the current page`);

    // Map 'published' status to 'approved' for frontend compatibility
    const mappedChapters = chapters.map((chapter) => ({
      ...chapter,
      status: chapter.status === "published" ? "approved" : chapter.status,
    }));

    // Return the chapters and pagination info
    res.json({
      chapters: mappedChapters,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error in admin chapter list:", err);
    res.status(500).json({
      msg: "Lỗi server khi tải danh sách chương",
      error: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
});

// @route   POST api/stories/:storyId/chapters/:chapterId/save
// @desc    Save a chapter to user's saved chapters
// @access  Private
router.post(
  "/:storyId/chapters/:chapterId/save",
  auth.verifyToken,
  async (req, res) => {
    try {
      const { storyId, chapterId } = req.params;
      const userId = req.user.id;

      // Validate story and chapter IDs
      if (
        !mongoose.Types.ObjectId.isValid(storyId) ||
        !mongoose.Types.ObjectId.isValid(chapterId)
      ) {
        return res.status(400).json({ success: false, msg: "ID không hợp lệ" });
      }

      // Check if story and chapter exist
      const story = await Story.findById(storyId);
      const chapter = await Chapter.findById(chapterId);

      if (!story || !chapter) {
        return res
          .status(404)
          .json({ success: false, msg: "Không tìm thấy truyện hoặc chương" });
      }

      // Check if chapter belongs to story
      if (chapter.story.toString() !== storyId) {
        return res
          .status(400)
          .json({ success: false, msg: "Chương không thuộc về truyện này" });
      }

      // Find user and update saved chapters
      const user = await User.findById(userId);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, msg: "Không tìm thấy người dùng" });
      }

      // Check if chapter is already saved
      const isAlreadySaved = user.savedChapters.some(
        (savedChap) => savedChap.chapter.toString() === chapterId
      );

      if (isAlreadySaved) {
        return res.status(400).json({
          success: false,
          msg: "Chương đã được lưu trước đó",
          isSaved: true,
        });
      }

      // Add chapter to saved chapters
      user.savedChapters.push({
        chapter: chapterId,
        story: storyId,
        savedAt: new Date(),
      });

      await user.save();

      res.json({
        success: true,
        msg: "Đã lưu chương thành công",
        isSaved: true,
      });
    } catch (err) {
      console.error("Error saving chapter:", err);
      res.status(500).json({
        success: false,
        msg: "Lỗi server khi lưu chương",
      });
    }
  }
);

// @route   POST api/chapters/:id/save
// @desc    Save/Unsave a chapter
// @access  Private
router.post("/:id/save", auth.verifyToken, async (req, res) => {
  try {
    const chapterId = req.params.id;
    const userId = req.user.id;

    // Validate chapter ID
    if (!mongoose.Types.ObjectId.isValid(chapterId)) {
      return res
        .status(400)
        .json({ success: false, msg: "ID chương không hợp lệ" });
    }

    // Check if chapter exists
    const chapter = await Chapter.findById(chapterId).populate(
      "story",
      "title"
    );
    if (!chapter) {
      return res
        .status(404)
        .json({ success: false, msg: "Không tìm thấy chương" });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, msg: "Không tìm thấy người dùng" });
    }

    // Check if chapter is already saved
    const savedChapterIndex = user.savedChapters.findIndex(
      (saved) => saved.chapter.toString() === chapterId
    );

    let isSaved = false;
    if (savedChapterIndex > -1) {
      // Chapter is already saved - remove it
      user.savedChapters.splice(savedChapterIndex, 1);
      isSaved = false;
    } else {
      // Chapter is not saved - add it
      user.savedChapters.unshift({
        chapter: chapterId,
        story: chapter.story._id,
        storyTitle: chapter.story.title,
        chapterTitle: chapter.title,
        chapterNumber: chapter.number,
        savedAt: new Date(),
      });
      isSaved = true;
    }

    await user.save();

    res.json({
      success: true,
      isSaved,
      msg: isSaved ? "Đã lưu chương thành công" : "Đã hủy lưu chương",
    });
  } catch (err) {
    console.error("Error saving chapter:", err);
    res.status(500).json({
      success: false,
      msg: "Lỗi server khi lưu chương",
    });
  }
});

// @route   GET api/chapters/saved
// @desc    Get user's saved chapters
// @access  Private
router.get("/saved", auth.verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("savedChapters")
      .populate({
        path: "savedChapters.chapter",
        select: "title number content",
      })
      .populate({
        path: "savedChapters.story",
        select: "title author cover",
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin người dùng",
      });
    }

    // Sort by savedAt in descending order (newest first)
    const savedChapters = user.savedChapters.sort(
      (a, b) => b.savedAt - a.savedAt
    );

    res.json({
      success: true,
      savedChapters,
    });
  } catch (error) {
    console.error("Error fetching saved chapters:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi tải danh sách chương đã lưu",
    });
  }
});

// @route   GET api/chapters/:id/admin
// @desc    Get chapter details for admin
// @access  Admin
router.get("/:id/admin", async (req, res) => {
  try {
    console.log("Admin chapter detail API called for ID:", req.params.id);

    const chapter = await Chapter.findById(req.params.id)
      .populate("story", "title _id author userId")
      .lean();

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy chương",
      });
    }

    // Map status for frontend consistency
    const mappedChapter = {
      ...chapter,
      status: chapter.status === "published" ? "approved" : chapter.status,
    };

    res.json({
      success: true,
      chapter: mappedChapter,
    });
  } catch (err) {
    console.error("Error in admin chapter detail:", err);
    if (err.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy chương",
      });
    }
    res.status(500).json({
      success: false,
      message: "Lỗi server khi tải chi tiết chương",
      error: err.message,
    });
  }
});

// @route   PUT api/chapters/:id/admin
// @desc    Update chapter details for admin
// @access  Admin
router.put("/:id/admin", async (req, res) => {
  try {
    console.log("Admin chapter update API called for ID:", req.params.id);
    console.log("Update data:", req.body);

    // Tìm chapter hiện tại để lấy thông tin
    const existingChapter = await Chapter.findById(req.params.id).populate(
      "story",
      "title _id author userId"
    );

    if (!existingChapter) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy chương",
      });
    }

    const { title, content, number, isVIP, status } = req.body;

    // Cập nhật các trường của chapter
    existingChapter.title = title || existingChapter.title;
    existingChapter.content = content || existingChapter.content;
    existingChapter.number = number || existingChapter.number;
    existingChapter.isVIP = isVIP !== undefined ? isVIP : existingChapter.isVIP;
    existingChapter.status = status === "approved" ? "published" : status;
    existingChapter.updatedAt = Date.now();

    // Lưu chapter đã cập nhật
    await existingChapter.save();

    // Map status for frontend consistency
    const mappedChapter = {
      ...existingChapter.toObject(),
      status:
        existingChapter.status === "published"
          ? "approved"
          : existingChapter.status,
    };

    // Cập nhật thời gian sửa đổi của truyện
    if (existingChapter.story) {
      await Story.findByIdAndUpdate(existingChapter.story._id, {
        updatedAt: Date.now(),
      });
    }

    res.json({
      success: true,
      chapter: mappedChapter,
    });
  } catch (err) {
    console.error("Error in admin chapter update:", err);
    if (err.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy chương",
      });
    }
    res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật chương",
      error: err.message,
    });
  }
});

module.exports = router;
