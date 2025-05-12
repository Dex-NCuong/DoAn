const mongoose = require("mongoose");

const storyViewSchema = new mongoose.Schema({
  story: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Story",
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  views: {
    type: Number,
    default: 1,
  },
});

// Tạo index cho story và date để tăng tốc độ truy vấn
storyViewSchema.index({ story: 1, date: 1 });

const StoryView = mongoose.model("StoryView", storyViewSchema);

module.exports = StoryView;
