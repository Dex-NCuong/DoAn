const express = require("express");
const router = express.Router();

// Registers route files
router.use("/users", require("./users"));
router.use("/auth", require("./auth"));
router.use("/settings", require("./settings"));
router.use("/genres", require("./genres"));
router.use("/stories", require("./stories"));
router.use("/chapters", require("./chapters"));
router.use("/transactions", require("./transactions"));
router.use("/authors", require("./authors"));

module.exports = router;
