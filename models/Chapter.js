const mongoose = require("mongoose");

const chapterSchema = new mongoose.Schema(
  {
    story: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Story",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    number: {
      type: Number,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    isFree: {
      type: Boolean,
      default: true,
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
      enum: ["draft", "pending", "published", "rejected", "paused"],
      default: "pending",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Compound index to ensure chapter numbers are unique per story
chapterSchema.index({ story: 1, number: 1 }, { unique: true });

const Chapter = mongoose.model("Chapter", chapterSchema);

module.exports = Chapter;
