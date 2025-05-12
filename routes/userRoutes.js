const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const auth = require("../middleware/auth");

// Get user profile
router.get("/profile", auth.isAuth, userController.getProfile);

// Update user profile
router.put("/profile", auth.isAuth, userController.updateProfile);

// Change password
router.put("/change-password", auth.isAuth, userController.changePassword);

// Get followed stories
router.get("/followed-stories", auth.isAuth, userController.getFollowedStories);

// Get transactions
router.get("/transactions", auth.isAuth, userController.getTransactions);

// Get coin packages
router.get("/coins", auth.isAuth, userController.getCoinPackages);

// Purchase coins
router.post("/purchase-coins", auth.isAuth, userController.purchaseCoins);

module.exports = router;
