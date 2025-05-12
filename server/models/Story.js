const mongoose = require("mongoose");

const StorySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Vui lòng nhập tiêu đề truyện"],
    trim: true,
  },
  description: {
    type: String,
    required: [true, "Vui lòng nhập mô tả truyện"],
  },
  cover: {
    type: String,
    default: "/images/default-cover.jpg",
  },
  genres: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Genre",
    },
  ],
  status: {
    type: String,
    enum: ["ongoing", "completed", "hiatus"],
    default: "ongoing",
  },
  isVIP: {
    type: Boolean,
    default: false,
  },
  views: {
    type: Number,
    default: 0,
  },
  likes: {
    type: Number,
    default: 0,
  },
  chapters: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chapter",
    },
  ],
  ratings: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      comment: String,
      date: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  avgRating: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  author: {
    type: String,
    required: [true, "Vui lòng nhập tên tác giả"],
    trim: true,
  },
});

// Tính toán đánh giá trung bình khi có đánh giá mới
StorySchema.methods.calculateAverageRating = function () {
  if (this.ratings.length === 0) {
    this.avgRating = 0;
    return;
  }

  const totalRating = this.ratings.reduce((sum, item) => sum + item.rating, 0);
  this.avgRating = totalRating / this.ratings.length;
};

module.exports = mongoose.model("Story", StorySchema);
