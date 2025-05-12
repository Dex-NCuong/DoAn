const fs = require("fs");
const path = require("path");

// Define paths
const publicDir = path.join(__dirname, "../public");
const imagesDir = path.join(publicDir, "images");
const uploadsDir = path.join(publicDir, "uploads");
const coversDir = path.join(uploadsDir, "covers");

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
createDir(publicDir);
createDir(imagesDir);
createDir(uploadsDir);
createDir(coversDir);

// Create placeholder cover images
const createPlaceholderImage = (name, color) => {
  // Create an SVG placeholder
  const svg = `
    <svg width="300" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect width="300" height="400" fill="${color}" />
      <text x="150" y="200" font-family="Arial" font-size="24" fill="white" text-anchor="middle">${name}</text>
    </svg>
  `;

  fs.writeFileSync(path.join(imagesDir, `${name}.svg`), svg);
  console.log(`Created placeholder image: ${name}.svg`);
};

// Create default cover
if (!fs.existsSync(path.join(coversDir, "default-cover.jpg"))) {
  const defaultCoverSvg = `
    <svg width="300" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect width="300" height="400" fill="#3498db" />
      <text x="150" y="200" font-family="Arial" font-size="24" fill="white" text-anchor="middle">Default Cover</text>
    </svg>
  `;

  fs.writeFileSync(path.join(coversDir, "default-cover.svg"), defaultCoverSvg);
  console.log(`Created default cover: default-cover.svg`);
}

// Create sample cover images
createPlaceholderImage("cover1", "#e74c3c");
createPlaceholderImage("cover2", "#2ecc71");
createPlaceholderImage("cover3", "#f39c12");
createPlaceholderImage("cover4", "#9b59b6");
createPlaceholderImage("cover5", "#1abc9c");
createPlaceholderImage("cover6", "#34495e");
createPlaceholderImage("cover7", "#d35400");
createPlaceholderImage("cover8", "#16a085");
createPlaceholderImage("cover9", "#8e44ad");

console.log(
  "All directories and placeholder images have been created successfully!"
);
