const express = require("express");
const router = express.Router();
const PaymentHistory = require("../models/PaymentHistory");
const auth = require("../middleware/auth");

// Lưu lịch sử thanh toán
router.post("/save-history", auth, async (req, res) => {
  try {
    const paymentHistory = new PaymentHistory({
      userId: req.user._id,
      packageId: req.body.packageId,
      amount: req.body.amount,
      coins: req.body.coins,
      bonusCoins: req.body.bonusCoins,
      bankName: req.body.bankName,
      cardNumber: req.body.cardNumber,
      cardHolder: req.body.cardHolder,
      status: req.body.status,
    });

    await paymentHistory.save();
    res.status(201).json({ success: true, data: paymentHistory });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Lấy lịch sử thanh toán của user
router.get("/history", auth, async (req, res) => {
  try {
    const history = await PaymentHistory.find({ userId: req.user._id }).sort({
      createdAt: -1,
    });
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
