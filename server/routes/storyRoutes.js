const express = require("express");
const router = express.Router();
const {
  getStories,
  getStory,
  createStory,
  updateStory,
  deleteStory,
  likeStory,
  rateStory,
  getStoriesForAdmin,
  getTopStoriesByViews,
} = require("../controllers/storyController");
const { protect, authorize } = require("../middleware/auth");

// Nested routes
const chapterRouter = require("./chapterRoutes");
router.use("/:storyId/chapters", chapterRouter);

// Public routes
router.get("/top-views", getTopStoriesByViews);
router.get("/", getStories);
router.get("/:id", getStory);

// Admin routes
router.get("/admin/list", getStoriesForAdmin);

// Protected routes
router.post("/", protect, authorize("admin"), createStory);
router.put("/:id", protect, authorize("admin"), updateStory);
router.delete("/:id", protect, authorize("admin"), deleteStory);
router.post("/:id/like", protect, likeStory);
router.post("/:id/rate", protect, rateStory);

module.exports = router;
