const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const path = require("path");
const cookieParser = require("cookie-parser");
const session = require("express-session");
require("dotenv").config();

// Import routes
const authRoutes = require("./routes/auth");
const storyRoutes = require("./routes/stories");
const chapterRoutes = require("./routes/chapters");
const adminRoutes = require("./routes/admin");
const userRoutes = require("./routes/users");
const transactionRoutes = require("./routes/transactions");
const apiStories = require("./routes/api/stories");
const apiChapters = require("./routes/api/chapters");
const apiGenres = require("./routes/api/genres");
const apiSettings = require("./routes/api/settings");
const apiUsers = require("./routes/api/users");
const apiCoinPackages = require("./routes/api/coin-packages");
const apiAuthors = require("./routes/api/authors");
const commentRoutes = require("./routes/commentRoutes");

// Initialize app
const app = express();
const PORT = process.env.PORT || 5000;

// Set up view engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Connect to MongoDB
console.log("Connecting to MongoDB with URI:", process.env.MONGODB_URI);
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Middleware
app.use(morgan("dev"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));
app.use(cookieParser());

// CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    return res.status(200).json({});
  }
  next();
});

app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // set to true if using https
  })
);

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/stories", apiStories);
app.use("/api/chapters", apiChapters);
app.use("/api/admin", adminRoutes);
app.use("/api/users", apiUsers);
app.use("/api/transactions", require("./routes/api/transactions"));
app.use("/api/genres", apiGenres);
app.use("/api/settings", apiSettings);
app.use("/api/coin-packages", apiCoinPackages);
app.use("/api/authors", apiAuthors);
app.use("/api/comments", commentRoutes);

// Regular routes (non-API)
app.use("/users", userRoutes);

// Admin API Routes (without /api prefix)
app.use("/admin", adminRoutes);

// Admin route for HTML files
app.get("/admin/*.html", (req, res) => {
  const requestedPage = req.path;
  res.sendFile(path.join(__dirname, "public", requestedPage));
});

// Admin route for index.html
app.get("/admin/index.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin", "index.html"));
});

// Serve index.html for all other routes
app.get("*", (req, res, next) => {
  // Skip admin routes that should be handled by the admin router
  if (req.path.startsWith("/admin/")) {
    return next();
  }
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: "error",
    message: "Something broke!",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;
