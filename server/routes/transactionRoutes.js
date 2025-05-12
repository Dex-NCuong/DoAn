const express = require("express");
const router = express.Router();
const {
  createDeposit,
  getMyTransactions,
  getTransaction,
  processTransaction,
} = require("../controllers/transactionController");
const { protect, authorize } = require("../middleware/auth");

// Protected routes
router.post("/deposit", protect, createDeposit);
router.get("/", protect, getMyTransactions);
router.get("/:id", protect, getTransaction);

// Admin only
router.post("/:id/process", protect, authorize("admin"), processTransaction);

module.exports = router;
