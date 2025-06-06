const express = require("express");
const router = express.Router();
const storyController = require("../controllers/storyController");

// List all stories with filtering options
router.get("/", storyController.getAllStories);

// Top 10 stories by views
router.get("/top-views", storyController.getTopStoriesByViews);

// Get single story details
router.get("/:id", storyController.getStoryDetail);

// Follow/unfollow story
router.post("/:id/follow", storyController.toggleFollowStory);

// Rate story
router.post("/:id/rate", storyController.rateStory);

module.exports = router;
