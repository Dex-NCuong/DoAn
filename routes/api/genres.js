const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const auth = require("../../middleware/auth");
const Genre = require("../../models/Genre");
const Story = require("../../models/Story");

// @route   GET api/genres
// @desc    Get all genres with pagination
// @access  Public
router.get("/", async (req, res) => {
  try {
    res.setHeader("Content-Type", "application/json");

    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const searchTerm = req.query.search || "";

    // Build search filter
    const filter = {};
    if (searchTerm) {
      filter.name = { $regex: searchTerm, $options: "i" };
    }

    // Get total count
    const total = await Genre.countDocuments(filter);

    // Base query with sorting
    let query = Genre.find(filter).sort({ name: 1 });

    // Apply limit if provided, regardless of page
    if (limit) {
      query = query.limit(limit);
    }

    // Apply pagination if both page and limit are provided
    if (page && limit) {
      const skip = (page - 1) * limit;
      query = query.skip(skip);
    }

    const genres = await query.lean();

    // Count stories for each genre
    const genresWithCounts = await Promise.all(
      genres.map(async (genre) => {
        try {
          const count = await Story.countDocuments({
            genres: { $in: [genre._id] },
          });

          return {
            ...genre,
            storyCount: count,
          };
        } catch (err) {
          console.error(`Error counting stories for genre ${genre.name}:`, err);
          return {
            ...genre,
            storyCount: 0,
          };
        }
      })
    );

    return res.json({
      success: true,
      data: {
        genres: genresWithCounts,
        pagination:
          page && limit
            ? {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
              }
            : null,
      },
    });
  } catch (err) {
    console.error("Lỗi khi lấy danh sách thể loại:", err.message);
    return res.status(500).json({
      error: "Server Error",
      message: err.message,
    });
  }
});

// @route   GET api/genres/:id
// @desc    Get genre by ID
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const genre = await Genre.findById(req.params.id).lean();

    if (!genre) {
      return res.status(404).json({ msg: "Không tìm thấy thể loại" });
    }

    // Count stories in this genre
    const storyCount = await Story.countDocuments({
      genres: genre._id,
      status: "published",
    });

    // Add story count to genre
    const result = {
      ...genre,
      storyCount,
    };

    res.json(result);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Không tìm thấy thể loại" });
    }
    res.status(500).send("Server Error");
  }
});

// @route   POST api/genres
// @desc    Create a new genre
// @access  Public (tạm thời cho test)
router.post(
  "/",
  /* auth.verifyToken, auth.isAdmin, */ async (req, res) => {
    try {
      const { name, description } = req.body;

      // Validate
      if (!name) {
        return res
          .status(400)
          .json({ msg: "Tên thể loại không được để trống" });
      }

      // Check if genre already exists
      const existingGenre = await Genre.findOne({ name });
      if (existingGenre) {
        return res.status(400).json({ msg: "Thể loại này đã tồn tại" });
      }

      // Create new genre
      const newGenre = new Genre({
        name,
        description,
      });

      // Save genre
      await newGenre.save();

      res.status(201).json({
        success: true,
        data: newGenre,
        msg: "Thêm thể loại thành công",
      });
    } catch (err) {
      console.error("Lỗi khi tạo thể loại mới:", err.message);
      return res.status(500).json({
        success: false,
        msg: "Lỗi server",
        error: err.message,
      });
    }
  }
);

// @route   PUT api/genres/:id
// @desc    Update a genre
// @access  Public (tạm thời cho test)
router.put(
  "/:id",
  /* auth.verifyToken, auth.isAdmin, */ async (req, res) => {
    try {
      const { name, description } = req.body;

      // Validate
      if (!name) {
        return res
          .status(400)
          .json({ msg: "Tên thể loại không được để trống" });
      }

      // Find genre by ID
      const genre = await Genre.findById(req.params.id);

      if (!genre) {
        return res.status(404).json({ msg: "Không tìm thấy thể loại" });
      }

      // Check if the new name already exists (if changed)
      if (name !== genre.name) {
        const existingGenre = await Genre.findOne({ name });
        if (existingGenre) {
          return res.status(400).json({ msg: "Thể loại này đã tồn tại" });
        }
      }

      // Update fields
      genre.name = name;
      genre.description = description;

      // Save genre
      await genre.save();

      res.json({
        success: true,
        data: genre,
        msg: "Cập nhật thể loại thành công",
      });
    } catch (err) {
      console.error("Lỗi khi cập nhật thể loại:", err.message);
      if (err.kind === "ObjectId") {
        return res.status(404).json({ msg: "Không tìm thấy thể loại" });
      }
      return res.status(500).json({
        success: false,
        msg: "Lỗi server",
        error: err.message,
      });
    }
  }
);

// @route   DELETE api/genres/:id
// @desc    Delete a genre
// @access  Public (tạm thời cho test)
router.delete(
  "/:id",
  /* auth.verifyToken, auth.isAdmin, */ async (req, res) => {
    try {
      // Find genre by ID
      const genre = await Genre.findById(req.params.id);

      if (!genre) {
        return res.status(404).json({ msg: "Không tìm thấy thể loại" });
      }

      // Count stories with this genre
      const storyCount = await Story.countDocuments({ genres: genre._id });

      // If there are stories with this genre, remove the genre from those stories
      if (storyCount > 0) {
        await Story.updateMany(
          { genres: genre._id },
          { $pull: { genres: genre._id } }
        );
      }

      // Delete the genre
      await Genre.deleteOne({ _id: req.params.id });

      res.json({
        success: true,
        msg: "Đã xóa thể loại thành công",
      });
    } catch (err) {
      console.error("Lỗi khi xóa thể loại:", err.message);
      if (err.kind === "ObjectId") {
        return res.status(404).json({ msg: "Không tìm thấy thể loại" });
      }
      return res.status(500).json({
        success: false,
        msg: "Lỗi server",
        error: err.message,
      });
    }
  }
);

// @route   GET api/genres/:id/stories
// @desc    Get all stories in a genre
// @access  Public
router.get("/:id/stories", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Verify genre exists
    const genre = await Genre.findById(req.params.id);
    if (!genre) {
      return res.status(404).json({ msg: "Không tìm thấy thể loại" });
    }

    // Build filter
    const filter = {
      genres: genre._id,
      status: "published",
    };

    // Filter by search term if provided
    if (req.query.search) {
      filter.$or = [
        { title: { $regex: req.query.search, $options: "i" } },
        { author: { $regex: req.query.search, $options: "i" } },
        { description: { $regex: req.query.search, $options: "i" } },
      ];
    }

    // Count total stories in this genre
    const total = await Story.countDocuments(filter);

    // Get stories
    const stories = await Story.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("genres", "name")
      .lean();

    // Add chapter count to each story
    const storiesWithDetails = await Promise.all(
      stories.map(async (story) => {
        const chapterCount = await mongoose.model("Chapter").countDocuments({
          story: story._id,
          status: "approved",
        });

        // Get latest chapter
        const latestChapter = await mongoose
          .model("Chapter")
          .findOne({
            story: story._id,
            status: "approved",
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

    res.json({
      genre: {
        _id: genre._id,
        name: genre.name,
        description: genre.description,
      },
      stories: storiesWithDetails,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Không tìm thấy thể loại" });
    }
    res.status(500).send("Server Error");
  }
});

module.exports = router;
