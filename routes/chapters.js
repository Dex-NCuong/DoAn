const express = require("express");
const router = express.Router();
const chapterController = require("../controllers/chapterController");

// Read chapter
router.get("/:storyId/chapters/:chapterNumber", chapterController.readChapter);

// Purchase chapter
router.post("/purchase/:chapterId", chapterController.purchaseChapter);

module.exports = router;
