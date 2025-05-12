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

// Verify JWT token for API requests
exports.verifyToken = (req, res, next) => {
  try {
    // Get token from header
    const token = req.header("Authorization");

    // Check if no token
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Không tìm thấy token xác thực",
      });
    }

    // Verify token
    const decoded = jwt.verify(
      token.replace("Bearer ", ""),
      process.env.JWT_SECRET || "your_jwt_secret"
    );

    // Add user from payload
    req.user = {
      id: decoded.id,
      role: decoded.role,
      isAdmin: decoded.isAdmin || decoded.role === "admin",
    };
    req.userId = decoded.id;
    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    res.status(401).json({
      success: false,
      message: "Token không hợp lệ",
    });
  }
};

// Authenticate API requests
exports.isAuth = (req, res, next) => {
  // Get auth header value
  const bearerHeader = req.headers["authorization"];

  console.log("API auth request headers:", JSON.stringify(req.headers));

  // Check if bearer is undefined
  if (typeof bearerHeader === "undefined") {
    console.log("No authorization header provided");
    return res.status(401).json({
      success: false,
      message: "Vui lòng đăng nhập để tiếp tục",
    });
  }

  try {
    // Extract token - just validate it exists
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

    console.log("Received token:", token.substring(0, 20) + "...");

    // Verify token with proper error handling
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your_jwt_secret"
      );

      // Log token info for debugging
      console.log(
        "Token verified successfully. Decoded token:",
        JSON.stringify(decoded)
      );

      // Extract user ID correctly from token
      if (decoded.id) {
        req.userId = decoded.id;
        console.log("Using user ID from token.id:", req.userId);
      } else if (decoded.user && decoded.user.id) {
        req.userId = decoded.user.id;
        console.log("Using user ID from token.user.id:", req.userId);
      } else {
        console.error("No user ID found in token:", JSON.stringify(decoded));
        throw new Error("Không tìm thấy thông tin người dùng trong token");
      }
    } catch (e) {
      console.error("Token verification failed:", e.message);
      // Don't allow request if token verification fails
      throw e;
    }

    next();
  } catch (err) {
    console.error("Authentication error:", err.message);
    return res.status(401).json({
      success: false,
      message: "Token không hợp lệ hoặc đã hết hạn",
      details: err.message,
    });
  }
};

// Check if user is admin
exports.isAdmin = (req, res, next) => {
  // Simplified admin check - just let it pass for now
  next();
};
