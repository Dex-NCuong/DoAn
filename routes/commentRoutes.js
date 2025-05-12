const express = require("express");
const router = express.Router();
const commentController = require("../controllers/commentController");
const { isAuth } = require("../middleware/auth");

// Get comments for a story
router.get("/:storyId", commentController.getComments);

// Create a new comment (requires authentication)
router.post("/:storyId", isAuth, commentController.createComment);

// Create a reply to a comment (requires authentication)
router.post("/:commentId/reply", isAuth, commentController.createReply);

// Like/unlike a comment (requires authentication)
router.post("/:commentId/like", isAuth, commentController.toggleLike);

module.exports = router;
