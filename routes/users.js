const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { isAuth } = require("../middleware/auth");

// User profile
router.get("/profile", isAuth, userController.getProfile);

// Update profile - support both PUT (RESTful) and POST (Form)
router.put("/profile", isAuth, userController.updateProfile);
router.post("/profile", isAuth, userController.updateProfile);

// Change password
router.put("/change-password", isAuth, userController.changePassword);
router.post("/change-password", isAuth, userController.changePassword);

// Upload avatar
router.post("/upload-avatar", isAuth, userController.uploadAvatar);

// Followed stories
router.get("/followed-stories", isAuth, userController.getFollowedStories);

// Transaction history
router.get("/transactions", isAuth, userController.getTransactions);

// Coin packages
router.get("/coins", isAuth, userController.getCoinPackages);

// Purchase coins
router.post("/coins/purchase", isAuth, userController.purchaseCoins);

module.exports = router;
