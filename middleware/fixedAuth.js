const jwt = require("jsonwebtoken");

// Check if user is authenticated
exports.isAuthenticated = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect("/auth/login");
  }
  next();
};

// Add user data to all responses
exports.addUserData = (req, res, next) => {
  if (req.session.userId) {
    res.locals.isLoggedIn = true;
    res.locals.username = req.session.username;
    res.locals.userRole = req.session.userRole;
  } else {
    res.locals.isLoggedIn = false;
  }
  next();
};

// Process JWT token verification for API routes
exports.verifyToken = (req, res, next) => {
  // Get auth header value
  const bearerHeader = req.headers["authorization"];

  // Check if bearer is undefined
  if (typeof bearerHeader === "undefined") {
    console.log("No authorization header provided");
    return res.status(401).json({
      success: false,
      message: "Vui lòng đăng nhập để tiếp tục",
    });
  }

  try {
    // Extract token
    const bearer = bearerHeader.split(" ");
    if (bearer.length !== 2 || bearer[0] !== "Bearer") {
      console.log("Invalid authorization format, expected: 'Bearer [token]'");
      throw new Error("Authorization header format must be 'Bearer [token]'");
    }

    const token = bearer[1];
    if (!token) {
      console.log("Token is empty");
      throw new Error("Token không hợp lệ");
    }

    // Verify the token and get the decoded data
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Token verified, decoded payload:", decoded);

      // Check for user ID in various possible locations
      req.userId =
        decoded.id || decoded._id || decoded.user?.id || decoded.user?._id;

      if (!req.userId) {
        console.log("No user ID found in token payload:", decoded);
        throw new Error("Token không chứa ID người dùng");
      }

      console.log("User ID extracted from token:", req.userId);
    } catch (e) {
      console.error("Token verification failed:", e.message);
      throw new Error(`Xác thực token thất bại: ${e.message}`);
    }

    next();
  } catch (err) {
    console.log("Authentication error:", err.message);
    return res.status(401).json({
      success: false,
      message: "Token không hợp lệ",
      details: err.message,
    });
  }
};

// Authenticate API requests
exports.isAuth = (req, res, next) => {
  // Get auth header value
  const bearerHeader = req.headers["authorization"];

  // Check if bearer is undefined
  if (typeof bearerHeader === "undefined") {
    console.log("No authorization header provided");
    return res.status(401).json({
      success: false,
      message: "Vui lòng đăng nhập để tiếp tục",
    });
  }

  try {
    // Extract token
    const bearer = bearerHeader.split(" ");
    if (bearer.length !== 2 || bearer[0] !== "Bearer") {
      console.log("Invalid authorization format, expected: 'Bearer [token]'");
      throw new Error("Authorization header format must be 'Bearer [token]'");
    }

    const token = bearer[1];
    if (!token) {
      console.log("Token is empty");
      throw new Error("Token không hợp lệ");
    }

    console.log(`Processing request with token: ${token.substring(0, 20)}...`);

    // Verify the token and get the decoded data
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Token verified, decoded payload:", decoded);

      // Check for user ID in various possible locations
      req.userId =
        decoded.id || decoded._id || decoded.user?.id || decoded.user?._id;

      if (!req.userId) {
        console.log("No user ID found in token payload:", decoded);
        throw new Error("Token không chứa ID người dùng");
      }

      // Log route info to help debug
      console.log(
        `User ${req.userId} accessing ${req.method} ${req.originalUrl}`
      );
    } catch (e) {
      console.error("Token verification failed:", e.message);
      return res.status(401).json({
        success: false,
        message: "Xác thực token thất bại",
        details: e.message,
      });
    }

    next();
  } catch (err) {
    console.log("Authentication error:", err.message);
    return res.status(401).json({
      success: false,
      message: "Token không hợp lệ",
      details: err.message,
    });
  }
};

// Check if user is admin
exports.isAdmin = (req, res, next) => {
  // Implement proper admin check
  if (!req.userId) {
    return res.status(401).json({
      success: false,
      message: "Vui lòng đăng nhập để tiếp tục",
    });
  }

  // Here you would check if the user has admin role
  next();
};
