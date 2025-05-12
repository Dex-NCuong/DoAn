/**
 * Simple Development Mode Middleware
 *
 * This middleware automatically attaches a mock admin user to requests
 * from localhost or with the X-Dev-Mode header.
 */

function createMockAdminUser() {
  // Create a simple mock admin user for development
  return {
    _id: "dev_admin_id",
    id: "dev_admin_id",
    username: "dev_admin",
    isAdmin: true,
  };
}

module.exports = function (req, res, next) {
  // Check if request is from localhost or has X-Dev-Mode header
  const isLocalhost =
    req.hostname === "localhost" || req.hostname === "127.0.0.1";

  const hasDevHeader = req.headers["x-dev-mode"] === "true";

  if (isLocalhost || hasDevHeader) {
    console.log("[DEV MODE] Attaching mock admin user to request");
    req.user = createMockAdminUser();
  }

  next();
};
