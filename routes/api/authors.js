const express = require("express");
const router = express.Router();
const Story = require("../../models/Story");
const mongoose = require("mongoose");

// @route   GET api/authors/name/:name/stories
// @desc    Get all stories by author name
// @access  Public
router.get("/name/:name/stories", async (req, res) => {
  try {
    const authorName = decodeURIComponent(req.params.name);
    console.log("Getting stories for author:", authorName);

    // Find all stories by author name
    const stories = await Story.find({ author: authorName })
      .select("_id title author coverImage views rating status")
      .sort({ createdAt: -1 });

    if (!stories || stories.length === 0) {
      return res.json({
        success: true,
        stories: [],
      });
    }

    res.json({
      success: true,
      stories: stories,
    });
  } catch (error) {
    console.error("Error getting author stories:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách truyện của tác giả",
    });
  }
});

// @route   GET api/authors/:id/stories
// @desc    Get all stories by an author ID
// @access  Public
router.get("/:id/stories", async (req, res) => {
  try {
    const authorId = req.params.id;

    // Validate author ID
    if (!mongoose.Types.ObjectId.isValid(authorId)) {
      return res.status(400).json({
        success: false,
        message: "ID tác giả không hợp lệ",
      });
    }

    // Tìm tất cả truyện của tác giả
    const stories = await Story.find({ authorId })
      .select("_id title author coverImage views rating status")
      .sort({ createdAt: -1 });

    if (!stories || stories.length === 0) {
      return res.json({
        success: true,
        stories: [],
      });
    }

    res.json({
      success: true,
      stories: stories,
    });
  } catch (error) {
    console.error("Error getting author stories:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách truyện của tác giả",
    });
  }
});

module.exports = router;
