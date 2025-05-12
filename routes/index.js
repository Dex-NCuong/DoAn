const express = require("express");
const router = express.Router();
const Story = require("../models/Story");
const Genre = require("../models/Genre");

// Homepage
router.get("/", async (req, res) => {
  try {
    console.log("Đang tải trang chủ...");

    // Get featured stories (if any)
    const featuredStories = await Story.find({ isFeatured: true })
      .populate("genres", "name")
      .limit(5);
    console.log("Featured stories found:", featuredStories.length);

    // Get hot stories - Đảm bảo tìm theo isHot: true và thêm sort
    const hotStories = await Story.find({ isHot: true })
      .populate("genres", "name")
      .sort({ updatedAt: -1, createdAt: -1 }) // Sắp xếp theo thời gian cập nhật và tạo mới nhất
      .limit(12);
    console.log(
      "Hot stories found:",
      hotStories.length,
      hotStories.map((s) => s.title)
    );

    // Get new stories - Đảm bảo tìm theo isNew: true và thêm sort
    const newStories = await Story.find({ isNew: true })
      .populate("genres", "name")
      .sort({ createdAt: -1, updatedAt: -1 }) // Sắp xếp theo thời gian tạo và cập nhật mới nhất
      .limit(12);
    console.log(
      "New stories found:",
      newStories.length,
      newStories.map((s) => s.title)
    );

    // Get completed stories - Truyện full
    const completedStories = await Story.find({ status: "completed" })
      .populate("genres", "name")
      .sort({ updatedAt: -1, createdAt: -1 }) // Sắp xếp theo thời gian cập nhật và tạo mới nhất
      .limit(12);
    console.log(
      "Completed stories found:",
      completedStories.length,
      completedStories.map((s) => s.title)
    );

    // Get all genres for sidebar
    const genres = await Genre.find().sort({ name: 1 });

    // Xóa bộ nhớ đệm và set headers để tránh cache
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.set("Expires", "-1");
    res.set("Pragma", "no-cache");

    res.render("index", {
      title: "Trang chủ - Web đọc truyện",
      featuredStories,
      hotStories,
      newStories,
      completedStories,
      genres,
      isLoggedIn: !!req.session.userId,
      username: req.session.username,
    });
  } catch (error) {
    console.error("Error loading homepage:", error);
    res.status(500).render("error", {
      title: "Lỗi",
      message: "Đã xảy ra lỗi khi tải trang chủ.",
    });
  }
});

// Search page
router.get("/search", async (req, res) => {
  try {
    const { q, page = 1, limit = 12 } = req.query;

    if (!q) {
      return res.redirect("/");
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Search stories
    const stories = await Story.find({ $text: { $search: q } })
      .populate("genres", "name")
      .sort({ score: { $meta: "textScore" } })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalStories = await Story.countDocuments({ $text: { $search: q } });
    const totalPages = Math.ceil(totalStories / parseInt(limit));

    // Get all genres for sidebar
    const genres = await Genre.find().sort({ name: 1 });

    res.render("stories/search", {
      title: `Kết quả tìm kiếm: ${q}`,
      stories,
      query: q,
      currentPage: parseInt(page),
      totalPages,
      totalStories,
      genres,
      isLoggedIn: !!req.session.userId,
      username: req.session.username,
    });
  } catch (error) {
    console.error("Error searching:", error);
    res.status(500).render("error", {
      title: "Lỗi",
      message: "Đã xảy ra lỗi khi tìm kiếm.",
    });
  }
});

// About page
router.get("/about", (req, res) => {
  res.render("about", {
    title: "Giới thiệu - Web đọc truyện",
    isLoggedIn: !!req.session.userId,
    username: req.session.username,
  });
});

// Contact page
router.get("/contact", (req, res) => {
  res.render("contact", {
    title: "Liên hệ - Web đọc truyện",
    isLoggedIn: !!req.session.userId,
    username: req.session.username,
  });
});

module.exports = router;
