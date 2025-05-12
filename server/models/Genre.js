const mongoose = require("mongoose");

const GenreSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Vui lòng nhập tên thể loại"],
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  stories: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Story",
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Genre", GenreSchema);
