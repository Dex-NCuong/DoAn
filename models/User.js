const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    coins: {
      type: Number,
      default: 0,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    avatar: {
      type: String,
      default: "default-avatar.jpg",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    savedChapters: [
      {
        chapter: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Chapter",
          required: true,
        },
        story: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Story",
          required: true,
        },
        savedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    followedStories: [
      {
        storyId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Story",
          required: true,
        },
        title: {
          type: String,
          required: true,
        },
        author: {
          type: String,
          required: true,
        },
        coverImage: {
          type: String,
          default: "/images/default-cover.jpg",
        },
        latestChapters: [
          {
            _id: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Chapter",
            },
            number: {
              type: Number,
            },
            title: {
              type: String,
            },
            createdAt: {
              type: Date,
            },
          },
        ],
        followedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    readingHistory: [
      {
        story: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Story",
          required: true,
        },
        chapter: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Chapter",
          required: true,
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
        _id: false,
      },
    ],
    userId: {
      type: String,
      unique: true,
      required: true,
    },
    status: {
      type: Boolean,
      default: true,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model("User", userSchema);
