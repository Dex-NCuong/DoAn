const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TransactionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["purchase", "usage", "reward", "deposit"],
      required: true,
    },
    coins: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled", "failed"],
      default: "pending",
    },
    // Purchase-specific fields
    payment: {
      method: {
        type: String,
        enum: ["momo", "banking", "card", "vnpay"],
      },
      transactionId: String,
      amount: Number,
      packageId: String,
    },
    // Usage-specific fields
    use: {
      target: {
        type: String,
        enum: ["chapter", "story", "donation"],
      },
      targetId: Schema.Types.ObjectId,
      info: String,
    },
    // Reward-specific fields
    reward: {
      reason: String,
      note: String,
    },
    // Status-specific fields
    completedAt: Date,
    cancelledAt: Date,
    cancelReason: String,
    failedAt: Date,
    failReason: String,
  },
  {
    timestamps: true,
  }
);

// Helper methods
TransactionSchema.methods.isPositive = function () {
  return ["deposit", "refund", "reward"].includes(this.type);
};

TransactionSchema.methods.isNegative = function () {
  return ["purchase"].includes(this.type);
};

module.exports = Transaction = mongoose.model("transaction", TransactionSchema);
