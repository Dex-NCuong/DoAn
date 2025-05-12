const Comment = require("../models/Comment");
const Story = require("../models/Story");
const { validateObjectId } = require("../utils/validator");

// Get comments for a story
exports.getComments = async (req, res) => {
  try {
    const { storyId } = req.params;
    const { page = 1, limit = 10, sort = "newest" } = req.query;

    if (!validateObjectId(storyId)) {
      return res.status(400).json({ message: "Invalid story ID" });
    }

    // Check if story exists
    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    // Build query
    const query = {
      story: storyId,
      parentComment: null,
      isDeleted: false,
    };

    // Build sort options
    const sortOptions =
      sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };

    // Execute query with pagination
    const comments = await Comment.find(query)
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("user", "username avatar")
      .lean();

    // Get total count
    const total = await Comment.countDocuments(query);

    // Recursive function to get all nested replies
    async function getNestedReplies(parentId) {
      const replies = await Comment.find({
        parentComment: parentId,
        isDeleted: false,
      })
        .sort({ createdAt: 1 })
        .populate("user", "username avatar")
        .lean();

      // Recursively get nested replies for each reply
      const repliesWithNested = await Promise.all(
        replies.map(async (reply) => {
          const nestedReplies = await getNestedReplies(reply._id);
          return {
            ...reply,
            nestedReplies,
          };
        })
      );

      return repliesWithNested;
    }

    // Get replies for each comment including nested replies
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await Comment.find({
          parentComment: comment._id,
          isDeleted: false,
        })
          .sort({ createdAt: 1 })
          .populate("user", "username avatar")
          .lean();

        // Get nested replies for each reply
        const repliesWithNested = await Promise.all(
          replies.map(async (reply) => {
            const nestedReplies = await getNestedReplies(reply._id);
            return {
              ...reply,
              nestedReplies,
            };
          })
        );

        return {
          ...comment,
          replies: repliesWithNested,
        };
      })
    );

    res.json({
      comments: commentsWithReplies,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error getting comments:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Create a new comment
exports.createComment = async (req, res) => {
  try {
    const { storyId } = req.params;
    const { content } = req.body;
    const userId = req.userId;

    if (!validateObjectId(storyId)) {
      return res.status(400).json({ message: "Invalid story ID" });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: "Comment content is required" });
    }

    // Check if story exists
    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    // Create new comment
    const comment = new Comment({
      content,
      user: userId,
      story: storyId,
    });

    await comment.save();

    // Populate user info
    await comment.populate("user", "displayName avatar");

    res.status(201).json(comment);
  } catch (error) {
    console.error("Error creating comment:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Create a reply to a comment
exports.createReply = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.userId;

    if (!validateObjectId(commentId)) {
      return res.status(400).json({ message: "Invalid comment ID" });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: "Reply content is required" });
    }

    // Check if parent comment exists
    const parentComment = await Comment.findById(commentId);
    if (!parentComment) {
      return res.status(404).json({ message: "Parent comment not found" });
    }

    // Determine the actual parent comment
    // If replying to a reply, use its parent comment as the parent
    const actualParentId = parentComment.parentComment || commentId;
    const replyToReplyId = parentComment.parentComment ? commentId : null;

    // Create new reply
    const reply = new Comment({
      content,
      user: userId,
      story: parentComment.story,
      parentComment: actualParentId,
      replyToReply: replyToReplyId, // Add reference to the reply being replied to
    });

    await reply.save();

    // Populate user info
    await reply.populate("user", "username avatar");

    res.status(201).json({
      ...reply.toObject(),
      replyToReply: replyToReplyId,
    });
  } catch (error) {
    console.error("Error creating reply:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Like/unlike a comment
exports.toggleLike = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.userId;

    if (!validateObjectId(commentId)) {
      return res.status(400).json({ message: "Invalid comment ID" });
    }

    // Find comment
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Check if user already liked the comment
    const likedIndex = comment.likes.indexOf(userId);

    if (likedIndex === -1) {
      // Add like
      comment.likes.push(userId);
    } else {
      // Remove like
      comment.likes.splice(likedIndex, 1);
    }

    await comment.save();

    res.json({
      likes: comment.likes.length,
      isLiked: likedIndex === -1,
    });
  } catch (error) {
    console.error("Error toggling like:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
