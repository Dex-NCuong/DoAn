const Chapter = require("../models/Chapter");
const Story = require("../models/Story");
const User = require("../models/User");
const Transaction = require("../models/Transaction");

// Read chapter
exports.readChapter = async (req, res) => {
  try {
    const { storyId, chapterNumber } = req.params;

    // Get story
    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).render("error", {
        title: "Không tìm thấy",
        message: "Truyện không tồn tại hoặc đã bị xóa.",
      });
    }

    // Get chapter
    const chapter = await Chapter.findOne({
      story: storyId,
      number: chapterNumber,
      status: "published",
    });

    if (!chapter) {
      return res.status(404).render("error", {
        title: "Không tìm thấy",
        message: "Chương truyện không tồn tại hoặc chưa được xuất bản.",
      });
    }

    // Check if chapter is free or user has purchased it
    let hasPurchased = false;

    if (!chapter.isFree) {
      // If not free, check if user is logged in
      if (!req.session.userId) {
        return res.render("chapters/locked", {
          title: `${story.title} - Chương ${chapter.number}`,
          story,
          chapter,
          isLoggedIn: false,
        });
      }

      // Check if user has purchased this chapter
      const transaction = await Transaction.findOne({
        user: req.session.userId,
        chapter: chapter._id,
        type: "usage",
        status: "completed",
      });

      hasPurchased = !!transaction;

      if (!hasPurchased) {
        // Get user's coins
        const user = await User.findById(req.session.userId);

        return res.render("chapters/locked", {
          title: `${story.title} - Chương ${chapter.number}`,
          story,
          chapter,
          user,
          isLoggedIn: true,
        });
      }
    }

    // Increment view count
    await Chapter.findByIdAndUpdate(chapter._id, { $inc: { views: 1 } });

    // Save reading history if user is logged in
    if (req.session.userId) {
      await User.findByIdAndUpdate(req.session.userId, {
        $push: {
          readingHistory: {
            story: storyId,
            chapter: chapter._id,
            readAt: new Date(),
          },
        },
      });
    }

    // Get next and previous chapters
    const nextChapter = await Chapter.findOne({
      story: storyId,
      number: { $gt: parseInt(chapterNumber) },
      status: "published",
    })
      .sort({ number: 1 })
      .select("number");

    const prevChapter = await Chapter.findOne({
      story: storyId,
      number: { $lt: parseInt(chapterNumber) },
      status: "published",
    })
      .sort({ number: -1 })
      .select("number");

    res.render("chapters/read", {
      title: `${story.title} - ${chapter.title}`,
      story,
      chapter,
      nextChapter,
      prevChapter,
      isLoggedIn: !!req.session.userId,
    });
  } catch (error) {
    console.error("Error reading chapter:", error);
    res.status(500).render("error", {
      title: "Lỗi",
      message: "Đã xảy ra lỗi khi tải chương truyện.",
    });
  }
};

// Purchase chapter
exports.purchaseChapter = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: "Vui lòng đăng nhập để mua chương truyện.",
      });
    }

    const { chapterId } = req.params;
    const userId = req.session.userId;

    // Get chapter
    const chapter = await Chapter.findById(chapterId).populate(
      "story",
      "title"
    );

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: "Chương truyện không tồn tại.",
      });
    }

    // Check if already purchased
    const existingTransaction = await Transaction.findOne({
      user: userId,
      chapter: chapterId,
      type: "usage",
      status: "completed",
    });

    if (existingTransaction) {
      return res.json({
        success: true,
        message: "Bạn đã mua chương này rồi.",
        redirectUrl: `/stories/${chapter.story._id}/chapters/${chapter.number}`,
      });
    }

    // Check if user has enough coins
    const user = await User.findById(userId);

    if (user.coins < chapter.coinPrice) {
      return res.json({
        success: false,
        message: "Bạn không đủ xu để mua chương này.",
        redirectUrl: "/users/coins",
      });
    }

    // Create transaction
    const transaction = new Transaction({
      user: userId,
      chapter: chapterId,
      type: "usage",
      amount: 0,
      coins: chapter.coinPrice,
      description: `Mua chương ${chapter.number} truyện ${chapter.story.title}`,
      status: "completed",
    });

    await transaction.save();

    // Update user coins
    await User.findByIdAndUpdate(userId, {
      $inc: { coins: -chapter.coinPrice },
    });

    res.json({
      success: true,
      message: "Mua chương thành công!",
      redirectUrl: `/stories/${chapter.story._id}/chapters/${chapter.number}`,
    });
  } catch (error) {
    console.error("Error purchasing chapter:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi mua chương truyện.",
    });
  }
};
