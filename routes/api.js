/**
 * Main API Routes Entry Point
 */

const express = require("express");
const router = express.Router();
const devMode = require("../middleware/devMode");

// Apply the development mode middleware to all API routes
router.use(devMode);

// Debug middleware - log all requests
router.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.originalUrl}`);
  console.log(
    `[API] User: ${req.user ? req.user.username : "not authenticated"}`
  );
  next();
});

// Mount all API route files
router.use("/users", require("./api/users"));
router.use("/auth", require("./api/auth"));
router.use("/settings", require("./api/settings"));
router.use("/genres", require("./api/genres"));
router.use("/stories", require("./api/stories"));
router.use("/chapters", require("./api/chapters"));
router.use("/transactions", require("./api/transactions"));

// Root API route
router.get("/", (req, res) => {
  res.json({
    status: "success",
    message: "Novel Reading Platform API",
    user: req.user
      ? {
          username: req.user.username,
          isAdmin: req.user.isAdmin,
        }
      : null,
  });
});

module.exports = router;
