const mongoose = require("mongoose");

const paymentHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  packageId: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  coins: {
    type: Number,
    required: true,
  },
  bonusCoins: {
    type: Number,
    default: 0,
  },
  bankName: {
    type: String,
    required: true,
  },
  cardNumber: {
    type: String,
    required: true,
  },
  cardHolder: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["success", "failed"],
    default: "success",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("PaymentHistory", paymentHistorySchema);
