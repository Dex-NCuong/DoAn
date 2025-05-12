const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const path = require("path");

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Route files
const authRoutes = require("./routes/authRoutes");
const storyRoutes = require("./routes/storyRoutes");
const chapterRoutes = require("./routes/chapterRoutes");
const transactionRoutes = require("./routes/transactionRoutes");

const app = express();

// CORS middleware - đơn giản hóa
app.use(cors());

// Body parser middleware
app.use(express.json());

// Debug middleware để log request
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  if (req.method === "POST" || req.method === "PUT") {
    console.log("Body:", req.body);
  }
  next();
});

// Serve static files từ thư mục public (cho cả dev và production)
app.use(express.static(path.join(__dirname, "..", "public")));

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/chapters", chapterRoutes);
app.use("/api/transactions", transactionRoutes);

// Root route API
app.get("/api", (req, res) => {
  res.json({ message: "API đọc truyện đang hoạt động" });
});

// Thêm route cụ thể cho login.html
app.get("/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "login.html"));
});

// Catch all routes - để tất cả yêu cầu khác trả về index.html
app.get("*", (req, res) => {
  // Nếu là request tới API thì trả về 404
  if (req.url.startsWith("/api/")) {
    return res.status(404).json({
      success: false,
      message: "API endpoint không tồn tại",
    });
  }

  // Nếu là request khác, trả về trang index.html
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    success: false,
    message: "Lỗi server",
    error: process.env.NODE_ENV === "production" ? null : err.stack,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server đang chạy trên cổng ${PORT}`);
  console.log(`API có sẵn tại http://localhost:${PORT}/api`);
  console.log(`Website có sẵn tại http://localhost:${PORT}`);
});
