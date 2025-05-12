const mongoose = require("mongoose");

const ChapterSchema = new mongoose.Schema({
  story: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Story",
    required: true,
  },
  title: {
    type: String,
    required: [true, "Vui lòng nhập tiêu đề chương"],
    trim: true,
  },
  content: {
    type: String,
    required: [true, "Vui lòng nhập nội dung chương"],
  },
  number: {
    type: Number,
    required: true,
  },
  isVIP: {
    type: Boolean,
    default: false,
  },
  coinPrice: {
    type: Number,
    default: 0,
  },
  views: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["draft", "pending", "published", "rejected"],
    default: "pending",
  },
  publishedAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Chapter", ChapterSchema);
