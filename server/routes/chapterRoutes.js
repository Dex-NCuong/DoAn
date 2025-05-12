const express = require("express");
const router = express.Router({ mergeParams: true });
const {
  getChapters,
  getChapter,
  createChapter,
  updateChapter,
  deleteChapter,
  purchaseChapter,
} = require("../controllers/chapterController");
const { protect, authorize } = require("../middleware/auth");

// Public routes (mức độ truy cập sẽ được kiểm tra trong controller)
router.get("/", getChapters);
router.get("/:id", getChapter);

// Protected routes
router.post("/", protect, authorize("admin"), createChapter);
router.put("/:id", protect, authorize("admin"), updateChapter);
router.delete("/:id", protect, authorize("admin"), deleteChapter);
router.post("/:id/purchase", protect, purchaseChapter);

module.exports = router;
