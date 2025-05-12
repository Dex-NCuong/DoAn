const fs = require("fs");
const path = require("path");

// Define paths
const publicDir = path.join(__dirname, "../public");
const uploadsDir = path.join(publicDir, "uploads");
const chaptersDir = path.join(uploadsDir, "chapters");
const coversDir = path.join(uploadsDir, "covers");
const avatarsDir = path.join(uploadsDir, "avatars");

// Create directories if they don't exist
const createDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  } else {
    console.log(`Directory already exists: ${dir}`);
  }
};

// Create all required directories
createDir(uploadsDir);
createDir(chaptersDir);
createDir(coversDir);
createDir(avatarsDir);

console.log("All directories have been set up successfully!");
