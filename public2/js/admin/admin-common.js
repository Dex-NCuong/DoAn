// Admin Common Functions

// API URL
const ADMIN_API_URL = "/api";

// DOM Elements
document.addEventListener("DOMContentLoaded", function () {
  // Thêm sự kiện đăng xuất
  const logoutBtn = document.getElementById("admin-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function (e) {
      e.preventDefault();
      logout();
    });
  }

  // Hiển thị tên người dùng admin
  const adminUsername = document.getElementById("admin-username");
  if (adminUsername) {
    const currentUser = getCurrentUser();
    if (currentUser) {
      adminUsername.textContent = currentUser.username;
    }
  }

  // Highlight active menu item
  highlightActiveMenuItem();
});

// Hiển thị username của admin
function displayAdminUsername() {
  const adminUsername = document.getElementById("admin-username");
  if (adminUsername) {
    const currentUser = getCurrentUser();
    if (currentUser) {
      adminUsername.textContent = currentUser.username;
    }
  }
}

// Highlight active menu item in sidebar
function highlightActiveMenuItem() {
  // Get current page path
  const currentPath = window.location.pathname;
  const pageName = currentPath.split("/").pop();

  // Find all menu items
  const menuItems = document.querySelectorAll(".admin-menu li");

  // Remove any existing active class
  menuItems.forEach((item) => {
    item.classList.remove("active");
  });

  // Add active class to current page's menu item
  menuItems.forEach((item) => {
    const link = item.querySelector("a");
    if (!link) return;

    const href = link.getAttribute("href");
    if (!href) return;

    // Handle index.html or empty path
    if (pageName === "" || pageName === "index.html") {
      if (
        href.includes("index.html") ||
        href === "./" ||
        href === "#dashboard"
      ) {
        item.classList.add("active");
      }
    }
    // Match other pages
    else if (href.includes(pageName)) {
      item.classList.add("active");
    }
  });
}

// Kiểm tra quyền admin
function checkAdminAuth() {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    // Người dùng chưa đăng nhập
    redirectToLogin();
    return false;
  }

  if (currentUser.role !== "admin") {
    // Người dùng không có quyền admin
    showMessage("Bạn không có quyền truy cập trang admin", "error");
    setTimeout(() => {
      window.location.href = "/";
    }, 2000);
    return false;
  }

  return true;
}

// Lấy thông tin người dùng hiện tại từ localStorage
function getCurrentUser() {
  const userJson = localStorage.getItem("user");
  if (!userJson) return null;

  try {
    return JSON.parse(userJson);
  } catch (error) {
    console.error("Lỗi khi phân tích thông tin người dùng:", error);
    return null;
  }
}

// Đăng xuất
function logout() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("user");
  window.location.href = "/login.html";
}

// Chuyển hướng đến trang đăng nhập
function redirectToLogin() {
  const currentPath = window.location.pathname;
  window.location.href = `/login.html?redirect=${encodeURIComponent(
    currentPath
  )}`;
}

// Hiển thị thông báo
function showMessage(message, type = "success") {
  const messageContainer = document.getElementById("messageContainer");
  const messageText = document.getElementById("messageText");

  if (!messageContainer || !messageText) return;

  // Set message text and type
  messageText.textContent = message;
  messageContainer.className = `admin-message ${type}`;

  // Show message
  messageContainer.classList.add("visible");

  // Hide message after 3 seconds
  setTimeout(() => {
    messageContainer.classList.remove("visible");
  }, 3000);
}

// Gửi request với token xác thực
async function authorizedFetch(url, options = {}) {
  const token = localStorage.getItem("auth_token");

  const defaultOptions = {
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...(options.headers || {}),
    },
  };

  try {
    const response = await fetch(url, mergedOptions);

    if (response.status === 401) {
      // Token hết hạn hoặc không hợp lệ
      logout();
      return null;
    }

    return response;
  } catch (error) {
    console.error("Lỗi khi gửi request:", error);
    throw error;
  }
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Escape HTML để tránh XSS
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Tạo phân trang
function createPagination(currentPage, totalPages, onPageChange) {
  const pagination = document.getElementById("pagination");
  if (!pagination) return;

  pagination.innerHTML = "";

  if (totalPages <= 1) return;

  // Previous button
  const prevBtn = document.createElement("button");
  prevBtn.className = "pagination-btn";
  prevBtn.disabled = currentPage === 1;
  prevBtn.innerHTML = "&laquo;";
  prevBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  });
  pagination.appendChild(prevBtn);

  // Page buttons
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, startPage + 4);

  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = document.createElement("button");
    pageBtn.className = `pagination-btn ${i === currentPage ? "active" : ""}`;
    pageBtn.textContent = i;
    pageBtn.addEventListener("click", () => {
      onPageChange(i);
    });
    pagination.appendChild(pageBtn);
  }

  // Next button
  const nextBtn = document.createElement("button");
  nextBtn.className = "pagination-btn";
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.innerHTML = "&raquo;";
  nextBtn.addEventListener("click", () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  });
  pagination.appendChild(nextBtn);
}

// Truncate text
function truncateText(text, maxLength) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}
