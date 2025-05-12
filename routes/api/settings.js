const express = require("express");
const router = express.Router();
const Setting = require("../../models/Setting");
const auth = require("../../middleware/auth");
const admin = require("../../middleware/admin");

// @route   GET /api/settings
// @desc    Get all settings
// @access  Public
router.get("/", async (req, res) => {
  try {
    const settings = await Setting.find();
    const settingsObject = {};

    // Convert array to object for easier access
    settings.forEach((setting) => {
      settingsObject[setting.key] = setting.value;
    });

    res.json(settingsObject);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Lỗi máy chủ" });
  }
});

// @route   PUT /api/settings
// @desc    Update settings
// @access  Private/Admin
router.put("/", [auth.verifyToken, auth.isAdmin], async (req, res) => {
  try {
    const updates = req.body;

    for (const key in updates) {
      await Setting.findOneAndUpdate(
        { key },
        { value: updates[key] },
        { upsert: true, new: true }
      );
    }

    res.json({ msg: "Cập nhật cài đặt thành công" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Lỗi máy chủ" });
  }
});

module.exports = router;
