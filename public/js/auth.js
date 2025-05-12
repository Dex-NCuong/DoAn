// Authentication Module

// Auth state
let currentUser = null;

// API URL
const API_URL = "/api";
const TOKEN_EXPIRY_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds

// Initialize authentication
document.addEventListener("DOMContentLoaded", function () {
  // Check for stored auth token
  initAuth();

  // Set up auth forms event listeners
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  if (registerForm) {
    registerForm.addEventListener("submit", handleRegister);
  }

  // Logout button
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }

  // Update UI based on auth state
  updateAuthUI();
});

// Initialize auth from stored token
function initAuth() {
  const token = localStorage.getItem("auth_token");
  const storedUser = localStorage.getItem("user");
  const tokenTimestamp = localStorage.getItem("token_timestamp");

  if (token && storedUser) {
    try {
      // Check token expiration time
      const currentTime = new Date().getTime();
      const tokenTime = tokenTimestamp ? parseInt(tokenTimestamp) : 0;
      const tokenAge = currentTime - tokenTime;

      // Log token age for debugging
      console.log(`Token age: ${Math.round(tokenAge / 1000 / 60)} minutes`);

      // Use stored user data if available
      currentUser = JSON.parse(storedUser);
      console.log("Using cached user data:", currentUser);
      updateAuthUI();

      // If token is likely to expire soon and we're online, try to refresh it
      if (tokenAge > TOKEN_EXPIRY_THRESHOLD && navigator.onLine) {
        console.log("Token might expire soon, trying to validate and refresh");
        refreshSession();
      } else if (navigator.onLine) {
        // Only validate with server if we're online
        validateSession();
      }
    } catch (error) {
      console.error("Invalid user data format", error);
      logout(); // Clear invalid data
    }
  } else if (token || storedUser) {
    // If we have only one of token or user data, clear both for consistency
    logout();
  }
}

// Validate session with server
function validateSession() {
  const token = localStorage.getItem("auth_token");
  if (!token) return;

  fetch(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Token invalid");
      }
      return response.json();
    })
    .then((data) => {
      if (data.success) {
        currentUser = data.user;
        // Update localStorage with fresh data
        localStorage.setItem("user", JSON.stringify(currentUser));
        // Update token timestamp
        localStorage.setItem("token_timestamp", new Date().getTime());
        console.log("User authenticated:", currentUser);
        updateAuthUI();
      } else {
        // Only logout if we know the token is invalid
        logout();
      }
    })
    .catch((error) => {
      console.error("Auth error:", error);
      // Don't logout on connection errors
      if (error.message === "Token invalid") {
        logout();
      }
    });
}

// Try to refresh the session
function refreshSession() {
  const token = localStorage.getItem("auth_token");
  if (!token) return;

  console.log("Attempting to refresh token...");

  // Call API endpoint to refresh token
  fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Cannot refresh token");
      }
      return response.json();
    })
    .then((data) => {
      if (data.success && data.token) {
        // Update token and timestamp
        localStorage.setItem("auth_token", data.token);
        localStorage.setItem("token_timestamp", new Date().getTime());
        console.log("Token refreshed successfully");

        // Update user data if provided
        if (data.user) {
          currentUser = data.user;
          localStorage.setItem("user", JSON.stringify(currentUser));
        }
      } else {
        // Fallback to regular validation
        validateSession();
      }
    })
    .catch((error) => {
      console.log(
        "Token refresh failed, falling back to validation:",
        error.message
      );
      validateSession();
    });
}

// Handle login form submission
function handleLogin(e) {
  e.preventDefault();

  // Tìm phần tử input an toàn và linh hoạt
  const emailInput =
    this.querySelector("#email") || this.querySelector("#username");
  const passwordInput = this.querySelector("#password");
  const errorElement =
    this.querySelector(".auth-error") || this.querySelector("#error-message");

  // Kiểm tra phần tử input có tồn tại không
  if (!emailInput || !passwordInput) {
    console.error("Missing form fields:", { emailInput, passwordInput });
    if (errorElement) {
      showAuthError(errorElement, "Lỗi: Không tìm thấy các trường form");
    } else {
      console.error("Error element not found");
    }
    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  // Basic validation
  if (!email || !password) {
    showAuthError(errorElement, "Vui lòng nhập email và mật khẩu");
    return;
  }

  // Clear previous errors
  clearAuthError(errorElement);

  // Show loading state
  const submitBtn = this.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "Đang đăng nhập...";

  // Call API
  fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        // Set current user and save token
        currentUser = data.user;

        // Đảm bảo các giá trị quan trọng có giá trị mặc định nếu thiếu
        currentUser.avatar = currentUser.avatar || "images/default-avatar.jpg";
        currentUser.coins = currentUser.coins || 0;

        localStorage.setItem("auth_token", data.token);
        localStorage.setItem("user", JSON.stringify(currentUser));

        // Update UI
        updateAuthUI();

        // Redirect to homepage or requested page
        const redirectUrl =
          new URLSearchParams(window.location.search).get("redirect") || "/";
        window.location.href = redirectUrl;
      } else {
        showAuthError(
          errorElement,
          data.message || "Email hoặc mật khẩu không chính xác"
        );
      }
    })
    .catch((error) => {
      console.error("Login error:", error);
      showAuthError(errorElement, "Lỗi kết nối, vui lòng thử lại sau");
    })
    .finally(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    });
}

// Handle register form submission
function handleRegister(e) {
  e.preventDefault();
  console.log("Register form submitted");

  // Tìm các phần tử input một cách an toàn
  const nameInput =
    this.querySelector("#username") || this.querySelector("#name");
  const emailInput = this.querySelector("#email");
  const passwordInput = this.querySelector("#password");
  const confirmPasswordInput = this.querySelector("#confirm-password");
  const errorElement =
    this.querySelector(".auth-error") || this.querySelector("#error-message");

  // Kiểm tra xem phần tử có tồn tại không trước khi đọc value
  if (!nameInput || !emailInput || !passwordInput || !confirmPasswordInput) {
    console.error("Missing form fields:", {
      nameInput,
      emailInput,
      passwordInput,
      confirmPasswordInput,
    });
    showAuthError(errorElement, "Lỗi: Không tìm thấy các trường form");
    return;
  }

  const username = nameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  console.log("Form data:", {
    username,
    email,
    password: "***",
    confirmPassword: "***",
  });

  // Basic validation
  if (!username || !email || !password) {
    showAuthError(errorElement, "Vui lòng điền đầy đủ thông tin");
    return;
  }

  if (password !== confirmPassword) {
    showAuthError(errorElement, "Mật khẩu xác nhận không khớp");
    return;
  }

  // Clear previous errors
  clearAuthError(errorElement);

  // Show loading state
  const submitBtn = this.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "Đang đăng ký...";

  console.log("Sending registration request to:", `${API_URL}/auth/register`);

  // Call API
  fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, email, password }),
  })
    .then((response) => {
      console.log("Registration response status:", response.status);
      console.log("Registration response headers:", {
        contentType: response.headers.get("content-type"),
      });

      if (!response.ok) {
        console.error("Registration response not OK:", response.status);
      }

      return response.json();
    })
    .then((data) => {
      console.log("Registration response data:", data);

      if (data.success) {
        // Set current user and save token
        currentUser = data.user;

        // Đảm bảo các giá trị quan trọng có giá trị mặc định nếu thiếu
        currentUser.avatar = currentUser.avatar || "images/default-avatar.jpg";
        currentUser.coins = currentUser.coins || 0;

        localStorage.setItem("auth_token", data.token);
        localStorage.setItem("user", JSON.stringify(currentUser));

        console.log("Registration successful! User:", currentUser);

        // Redirect to homepage or requested page
        alert("Đăng ký thành công!");
        const redirectUrl =
          new URLSearchParams(window.location.search).get("redirect") || "/";
        window.location.href = redirectUrl;
      } else {
        console.error("Registration failed:", data.message);
        showAuthError(
          errorElement,
          data.message || "Đã xảy ra lỗi khi đăng ký"
        );
      }
    })
    .catch((error) => {
      console.error("Registration error:", error);
      showAuthError(
        errorElement,
        "Lỗi kết nối: Vui lòng đảm bảo server đang chạy"
      );
    })
    .finally(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    });
}

// Handle logout
function handleLogout(e) {
  e.preventDefault();
  logout();
  window.location.href = "/";
}

// Login user and save token
function login(user) {
  currentUser = user;

  // Create a simple token (for demo purposes)
  // In a real app, this would come from your backend
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify(user));
  const signature = btoa("demo-signature"); // Not a real signature
  const token = `${header}.${payload}.${signature}`;

  // Save token to localStorage
  localStorage.setItem("auth_token", token);

  // Update UI
  updateAuthUI();
}

// Logout user and clear token
function logout() {
  currentUser = null;
  localStorage.removeItem("auth_token");
  localStorage.removeItem("user");

  // Update UI
  updateAuthUI();
}

// Update UI based on auth state
function updateAuthUI() {
  const authSection = document.getElementById("auth-section");
  const registerLink = document.getElementById("register-link");

  if (!authSection) return;

  if (currentUser) {
    // Remove register link if it exists
    if (registerLink) {
      registerLink.style.display = "none";
    }

    // Create dropdown for logged in user
    authSection.className = "dropdown";
    const userAvatar = currentUser.avatar || "images/default-avatar.jpg";

    authSection.innerHTML = `
      <a href="#" class="dropdown-toggle">
        <img src="${userAvatar}" alt="user" class="user-avatar" />
        <span class="username">${currentUser.username || "Người dùng"}</span>
        <i class="fas fa-caret-down"></i>
      </a>
      <div class="dropdown-content">
        <a href="profile.html">
          <i class="fas fa-user"></i> Tài khoản
        </a>
        <a href="user-followed.html">
          <i class="fas fa-bookmark"></i> Truyện đang theo dõi
        </a>
        <a href="user-history.html">
          <i class="fas fa-history"></i> Lịch sử đọc truyện
        </a>
        <a href="user-coins.html">
          <i class="fas fa-coins"></i> Nạp xu (${currentUser.coins || 0})
        </a>
        <a href="user-transactions.html">
          <i class="fas fa-exchange-alt"></i> Lịch sử giao dịch
        </a>
        ${
          currentUser.role === "admin"
            ? `
        <a href="/admin/stories.html" class="admin-link">
          <i class="fas fa-book-open"></i> Quản trị truyện
        </a>
        `
            : ""
        }
        <a href="#" id="logout-btn">
          <i class="fas fa-sign-out-alt"></i> Đăng xuất
        </a>
      </div>
    `;

    // Add event listener for new logout button
    const newLogoutBtn = authSection.querySelector("#logout-btn");
    if (newLogoutBtn) {
      newLogoutBtn.addEventListener("click", handleLogout);
    }
  } else {
    // Show login and register for logged out users
    authSection.className = "";
    authSection.innerHTML = '<a href="login.html">Đăng nhập</a>';

    if (registerLink) {
      registerLink.style.display = "block";
    }
  }
}

// Show auth error message
function showAuthError(element, message) {
  if (element) {
    element.textContent = message;
    element.style.display = "block";
  }
}

// Clear auth error message
function clearAuthError(element) {
  if (element) {
    element.textContent = "";
    element.style.display = "none";
  }
}

// Check if user is authenticated
function isAuthenticated() {
  return currentUser !== null;
}

// Redirect to login if not authenticated
function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = `/login.html?redirect=${encodeURIComponent(
      window.location.pathname
    )}`;
    return false;
  }
  return true;
}

// Get current user
function getCurrentUser() {
  return currentUser;
}

// API call helper with auth
function authorizedFetch(url, options = {}) {
  const token = localStorage.getItem("auth_token");
  if (!token) {
    return Promise.reject(new Error("No authentication token"));
  }

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };

  return fetch(url, {
    ...options,
    headers,
  });
}

// Expose auth functions to global scope
window.auth = {
  isAuthenticated,
  requireAuth,
  getCurrentUser,
  login,
  logout,
  authorizedFetch,
  API_URL,
  updateCurrentUser: function (userData) {
    currentUser = userData;
    updateAuthUI();
  },
};

// Authentication Functions

/**
 * Đăng ký tài khoản
 * @param {Object} userData Thông tin người dùng
 * @returns {Promise} Promise
 */
async function register(userData) {
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Lỗi khi đăng ký tài khoản");
    }

    return data;
  } catch (error) {
    console.error("Register error:", error);
    throw error;
  }
}

/**
 * Đăng nhập
 * @param {string} username Tên đăng nhập
 * @param {string} password Mật khẩu
 * @returns {Promise} Promise
 */
async function login(username, password) {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Đăng nhập thất bại");
    }

    // Lưu token và thông tin người dùng
    localStorage.setItem("auth_token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    return data;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

/**
 * Cập nhật thông tin người dùng
 * @param {Object} userData Thông tin người dùng cần cập nhật
 * @returns {Promise} Promise
 */
async function updateProfile(userData) {
  try {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      throw new Error("Bạn chưa đăng nhập");
    }

    const response = await fetch(`${API_URL}/users/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Lỗi khi cập nhật thông tin");
    }

    // Cập nhật thông tin người dùng trong localStorage
    const currentUser = JSON.parse(localStorage.getItem("user"));
    const updatedUser = { ...currentUser, ...userData };
    localStorage.setItem("user", JSON.stringify(updatedUser));

    return data;
  } catch (error) {
    console.error("Update profile error:", error);
    throw error;
  }
}

/**
 * Đổi mật khẩu
 * @param {string} currentPassword Mật khẩu hiện tại
 * @param {string} newPassword Mật khẩu mới
 * @returns {Promise} Promise
 */
async function changePassword(currentPassword, newPassword) {
  try {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      throw new Error("Bạn chưa đăng nhập");
    }

    const response = await fetch(`${API_URL}/users/change-password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Lỗi khi đổi mật khẩu");
    }

    return data;
  } catch (error) {
    console.error("Change password error:", error);
    throw error;
  }
}

/**
 * Kiểm tra trạng thái đăng nhập
 * @returns {boolean} Trạng thái đăng nhập
 */
function isLoggedIn() {
  const token = localStorage.getItem("auth_token");
  return !!token;
}

// Check admin authentication
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

// Redirect to login page
function redirectToLogin() {
  window.location.href = "../login.html";
}

// Show message to user
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
