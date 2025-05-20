// Profile Page JavaScript
document.addEventListener("DOMContentLoaded", function () {
  // Kiểm tra đăng nhập
  const token = localStorage.getItem("auth_token");
  if (!token) {
    console.log("No auth token found, redirecting to login");
    redirectToLogin();
    return;
  }

  console.log("Auth token found, staying on profile page");

  // Lấy thông tin người dùng từ localStorage
  const userJson = localStorage.getItem("user");
  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      console.log("Profile page loaded with user:", user);

      // Cập nhật thông tin người dùng trên trang
      updateProfileUI(user);

      // Thiết lập chức năng tải lên avatar mới
      setupAvatarUpload(user);

      // Thiết lập nút đăng xuất
      if (logoutBtn) {
        logoutBtn.addEventListener("click", logout);
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
      alert("Đã xảy ra lỗi khi tải thông tin người dùng.");
    }
  }
});

// Thiết lập chức năng tải lên avatar mới
function setupAvatarUpload(user) {
  const fileInput = document.getElementById("sidebar-avatar-upload");
  if (!fileInput) return;

  fileInput.addEventListener("change", async function (e) {
    const file = e.target.files[0];
    if (!file) {
      console.log("No file selected");
      return;
    }

    // Kiểm tra loại file
    if (!file.type.match("image.*")) {
      alert("Vui lòng chọn file hình ảnh");
      fileInput.value = ""; // Reset input
      return;
    }

    // Kiểm tra kích thước file (tối đa 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("Kích thước file tối đa là 10MB");
      fileInput.value = ""; // Reset input
      return;
    }

    console.log("Processing avatar file:", file.name, file.type, file.size);

    try {
      // Hiển thị loading state
      const avatarElement = document.querySelector(".avatar");
      if (avatarElement) {
        avatarElement.innerHTML = `<div class="loading-spinner"></div>`;
      }

      // Đọc file thành base64
      const imageUrl = await readFileAsDataURL(file);

      console.log(
        "Image successfully read as data URL, size:",
        Math.round(imageUrl.length / 1024),
        "KB"
      );

      // Cập nhật UI tạm thời
      updateAvatarPreview(imageUrl);

      // Lưu vào cơ sở dữ liệu
      console.log("Attempting to save avatar to server...");
      const savedAvatar = await saveAvatarToServer(imageUrl);

      if (savedAvatar) {
        console.log("Avatar successfully saved to server");
      } else {
        console.warn("No avatar URL returned from server, using local image");
      }

      // Lưu vào localStorage với URL từ server (nếu có)
      saveAvatarToLocalStorage(savedAvatar || imageUrl);

      alert("Cập nhật ảnh đại diện thành công!");
    } catch (error) {
      console.error("Error processing avatar:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });

      // Kiểm tra nếu là lỗi phiên đăng nhập hết hạn
      if (
        error.message &&
        (error.message.includes("phiên đăng nhập") ||
          error.message.includes("hết hạn") ||
          error.message.includes("unauthorized") ||
          error.message.includes("Không tìm thấy thông tin người dùng"))
      ) {
        alert(
          "Phiên đăng nhập đã hết hạn. Đang chuyển hướng đến trang đăng nhập..."
        );
        redirectToLogin();
        return;
      }

      alert("Có lỗi xảy ra khi xử lý ảnh: " + error.message);

      // Khôi phục avatar cũ nếu có lỗi
      const userJson = localStorage.getItem("user");
      if (userJson) {
        const user = JSON.parse(userJson);
        if (user.avatar) {
          updateAvatarPreview(user.avatar);
        } else {
          // Khôi phục về icon mặc định
          const avatarElement = document.querySelector(".avatar");
          if (avatarElement) {
            avatarElement.innerHTML = `<i class="fas fa-user-circle"></i>`;
          }
        }
      }

      fileInput.value = ""; // Reset input
    }
  });
}

// Đọc file thành dataURL
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = function (e) {
      resolve(e.target.result);
    };

    reader.onerror = function (error) {
      reject(error);
    };

    reader.readAsDataURL(file);
  });
}

// Cập nhật giao diện hiển thị avatar
function updateAvatarPreview(imageUrl) {
  // Cập nhật avatar trong sidebar
  const avatarElement = document.querySelector(".avatar");
  if (avatarElement) {
    avatarElement.innerHTML = `<img src="${imageUrl}" alt="Avatar" />`;
  }
}

// Lưu avatar vào localStorage
function saveAvatarToLocalStorage(imageUrl) {
  try {
    const userJson = localStorage.getItem("user");
    if (userJson) {
      const user = JSON.parse(userJson);
      user.avatar = imageUrl;
      localStorage.setItem("user", JSON.stringify(user));
      console.log("Avatar saved to localStorage");
    }
  } catch (error) {
    console.error("Error saving avatar to localStorage:", error);
  }
}

// Lưu avatar lên server
async function saveAvatarToServer(imageBase64) {
  try {
    // Lấy token xác thực từ localStorage
    const token = localStorage.getItem("auth_token");
    if (!token) {
      console.error("No auth token found");
      throw new Error("Không tìm thấy token xác thực. Vui lòng đăng nhập lại.");
    }

    // Log phần đầu của token để debugging (không log toàn bộ token vì lý do bảo mật)
    console.log(
      "Using token (first 20 chars):",
      token.substring(0, 20) + "..."
    );

    // Kiểm tra xem token có định dạng đúng không
    const tokenParts = token.split(".");
    if (tokenParts.length !== 3) {
      console.error(
        "Token does not appear to be valid JWT format (should have 3 parts separated by dots)"
      );
    }

    // Kiểm tra nếu imageBase64 quá lớn
    if (imageBase64.length > 1024 * 1024) {
      console.warn(
        "Image data is large:",
        Math.round(imageBase64.length / 1024),
        "KB"
      );
    }

    // Gửi request đến API
    console.log("Sending request to /api/users/avatar");
    const response = await fetch("/api/users/avatar", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ avatar: imageBase64 }),
    });

    console.log("Response status:", response.status, response.statusText);
    console.log("Response headers:", {
      contentType: response.headers.get("content-type"),
      contentLength: response.headers.get("content-length"),
    });

    // Kiểm tra response
    if (!response.ok) {
      // Xử lý lỗi 401 Unauthorized
      if (response.status === 401) {
        console.log("Got 401 Unauthorized, trying to refresh token");

        // Thử refresh token trước khi chuyển hướng
        try {
          const refreshed = await refreshTokenAndRetry();
          if (refreshed) {
            // Thử lại request với token mới
            return await saveAvatarToServer(imageBase64);
          }
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
        }

        throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      }

      // Kiểm tra Content-Type để xác định nếu response là HTML thay vì JSON
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
        console.error(
          "Server trả về HTML thay vì JSON. Có thể server đang gặp lỗi."
        );
        const htmlContent = await response.text();
        console.error(
          "HTML response (first 300 chars):",
          htmlContent.substring(0, 300)
        );
        throw new Error("Lỗi máy chủ. Vui lòng thử lại sau.");
      }

      // Nếu không phải HTML, thử parse JSON
      try {
        const errorData = await response.json();
        console.error("Server returned error:", errorData);
        throw new Error(errorData.message || "Lỗi khi cập nhật ảnh đại diện");
      } catch (jsonError) {
        // Nếu không thể parse JSON, sử dụng status text và log response text
        console.error("Failed to parse error response as JSON:", jsonError);
        try {
          const textResponse = await response.text();
          console.error("Raw response text:", textResponse);
        } catch (textError) {
          console.error("Failed to get response text:", textError);
        }
        throw new Error(
          `Lỗi máy chủ: ${response.status} ${response.statusText}`
        );
      }
    }

    // Kiểm tra Content-Type trước khi parse JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.warn("Server không trả về JSON: ", contentType);
      try {
        const textResponse = await response.text();
        console.warn("Non-JSON response text:", textResponse);
      } catch (e) {
        console.error("Failed to read non-JSON response:", e);
      }
      // Vẫn tiếp tục với base64 gốc
      return imageBase64;
    }

    // Lấy dữ liệu từ response
    try {
      const data = await response.json();
      console.log("Response data:", data);

      // Nếu server trả về URL avatar (trường hợp server lưu ảnh riêng)
      if (data.avatarUrl) {
        console.log("Avatar saved to server, URL:", data.avatarUrl);
        return data.avatarUrl;
      }

      // Nếu server trả về avatar hoặc user object
      if (data.user && data.user.avatar) {
        console.log("User data with avatar received from server");

        // Cập nhật toàn bộ dữ liệu user trong localStorage
        localStorage.setItem("user", JSON.stringify(data.user));
        return data.user.avatar;
      }

      if (data.avatar) {
        console.log("Avatar saved to server");
        return data.avatar;
      }

      // Nếu server không trả về URL, sử dụng base64 đã gửi
      console.log("Avatar saved to server, using original base64");
      return imageBase64;
    } catch (jsonError) {
      console.error("Không thể parse JSON từ server:", jsonError);
      return imageBase64;
    }
  } catch (error) {
    console.error("Error saving avatar to server:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    // Kiểm tra nếu là lỗi phiên đăng nhập hết hạn
    if (
      error.message &&
      (error.message.includes("phiên đăng nhập") ||
        error.message.includes("hết hạn") ||
        error.message.includes("unauthorized") ||
        error.message.includes("401"))
    ) {
      throw error; // Re-throw để xử lý ở cấp cao hơn
    }
    throw new Error(`Lỗi khi gửi ảnh lên server: ${error.message}`);
  }
}

// Hàm thử làm mới token và thử lại yêu cầu
async function refreshTokenAndRetry() {
  try {
    console.log("Attempting to refresh token");
    const token = localStorage.getItem("auth_token");

    if (!token) {
      console.log("No token to refresh");
      return false;
    }

    // Gọi API để làm mới token
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.log("Token refresh failed with status:", response.status);
      return false;
    }

    const data = await response.json();

    if (data.success && data.token) {
      console.log("Token refreshed successfully");

      // Lưu token mới vào localStorage
      localStorage.setItem("auth_token", data.token);

      // Nếu server trả về dữ liệu người dùng, cập nhật
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      // Cập nhật timestamp
      localStorage.setItem("token_timestamp", new Date().getTime());

      return true;
    }

    return false;
  } catch (error) {
    console.error("Error refreshing token:", error);
    return false;
  }
}

// Cập nhật giao diện với thông tin người dùng
function updateProfileUI(user) {
  if (!user) return;

  // Hiển thị ID tài khoản
  const userIdField = document.getElementById("user-id");
  if (userIdField) {
    userIdField.value = user.userId || user._id || "";
  }

  // Cập nhật tên người dùng ở sidebar
  if (usernameElement) {
    usernameElement.textContent = user.username || "Người dùng";
  }

  // Cập nhật số xu
  if (userCoinsElement) {
    userCoinsElement.textContent = user.coins || 0;
  }

  // Cập nhật tên đăng nhập trong form
  if (usernameField) {
    usernameField.value = user.username || "";
  }

  // Cập nhật email trong form
  if (emailField) {
    emailField.value = user.email || "";
  }

  // Cập nhật tên hiển thị trong form
  if (displayNameField) {
    displayNameField.value = user.displayName || user.username || "";
  }

  // Cập nhật avatar trong sidebar
  if (user.avatar) {
    updateAvatarPreview(user.avatar);
  }
}

// Xử lý đăng xuất
function logout() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("user");
  window.location.href = "/";
}

// Chuyển hướng đến trang đăng nhập và lưu URL hiện tại để quay lại sau khi đăng nhập
function redirectToLogin() {
  // Lưu URL hiện tại vào localStorage để redirect sau khi đăng nhập
  const currentUrl = window.location.pathname + window.location.search;

  // Xóa token và thông tin người dùng
  localStorage.removeItem("auth_token");

  // Chuyển hướng đến trang đăng nhập với tham số redirect
  window.location.href = `/login.html?redirect=${encodeURIComponent(
    currentUrl
  )}`;
}

// DOM Elements
const usernameElement = document.getElementById("username");
const usernameField = document.getElementById("username-field");
const emailField = document.getElementById("email");
const displayNameField = document.getElementById("display-name");
const userCoinsElement = document.getElementById("userCoins");
const logoutBtn = document.getElementById("logout-btn");
const passwordForm = document.getElementById("password-update-form");
const currentPasswordField = document.getElementById("current-password");
const newPasswordField = document.getElementById("new-password");
const confirmPasswordField = document.getElementById("confirm-password");
const passwordSubmitBtn = document.getElementById("password-submit-btn");

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  // Add a debug button to the sidebar
  addDebugButton();

  // Password change form
  if (passwordForm) {
    passwordForm.addEventListener("submit", handlePasswordChange);
  }

  // Logout button
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
  }
});

// Handle password change
async function handlePasswordChange(e) {
  e.preventDefault();

  // Get form values
  const currentPassword = currentPasswordField.value;
  const newPassword = newPasswordField.value;
  const confirmPassword = confirmPasswordField.value;

  // Validate inputs
  if (!currentPassword || !newPassword || !confirmPassword) {
    alert("Vui lòng điền đầy đủ thông tin.");
    return;
  }

  if (newPassword !== confirmPassword) {
    alert("Mật khẩu mới và xác nhận mật khẩu không khớp.");
    return;
  }

  if (newPassword.length < 6) {
    alert("Mật khẩu mới phải có ít nhất 6 ký tự.");
    return;
  }

  // Show loading state
  const originalBtnText = passwordSubmitBtn
    ? passwordSubmitBtn.textContent
    : "Đổi mật khẩu";
  if (passwordSubmitBtn) {
    passwordSubmitBtn.disabled = true;
    passwordSubmitBtn.textContent = "Đang xử lý...";
  }

  try {
    // Get current username
    const user = JSON.parse(localStorage.getItem("user"));
    const username = user ? user.username : null;

    if (!username) {
      throw new Error(
        "Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại."
      );
    }

    // Make API request
    console.log("Sending password change request for user:", username);

    const response = await fetch("/api/users/change-password", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        currentPassword,
        newPassword,
      }),
    });

    // Check for 400-level errors first
    if (response.status >= 400 && response.status < 500) {
      const data = await response.json();
      throw new Error(
        data.message ||
          "Lỗi khi đổi mật khẩu. Vui lòng kiểm tra thông tin đã nhập."
      );
    }

    // Check for general response errors
    if (!response.ok) {
      throw new Error(
        `Lỗi máy chủ (${response.status}). Vui lòng thử lại sau.`
      );
    }

    // Parse success response
    const data = await response.json();

    // Update token and user info if provided
    if (data.token) {
      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("token_timestamp", new Date().getTime());
    }

    if (data.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
    }

    // Show success message
    alert("Đổi mật khẩu thành công!");

    // Clear form
    currentPasswordField.value = "";
    newPasswordField.value = "";
    confirmPasswordField.value = "";
  } catch (error) {
    console.error("Error changing password:", error);
    alert(error.message || "Đã xảy ra lỗi khi đổi mật khẩu. Vui lòng thử lại.");
  } finally {
    // Reset button state
    if (passwordSubmitBtn) {
      passwordSubmitBtn.disabled = false;
      passwordSubmitBtn.textContent = originalBtnText;
    }
  }
}

// Add a debug button to diagnose token issues
function addDebugButton() {
  // Create the debug button container
  const debugContainer = document.createElement("div");
  debugContainer.className = "debug-container";
  debugContainer.style.margin = "20px 0";
  debugContainer.style.textAlign = "center";

  // Create Debug Token button
  const debugButton = document.createElement("button");
  debugButton.textContent = "Kiểm tra Token";
  debugButton.className = "btn btn-secondary";
  debugButton.style.marginRight = "10px";
  debugButton.style.fontSize = "14px";
  debugButton.style.padding = "5px 10px";

  // Create Clear Token button
  const clearButton = document.createElement("button");
  clearButton.textContent = "Xóa Token";
  clearButton.className = "btn btn-danger";
  clearButton.style.fontSize = "14px";
  clearButton.style.padding = "5px 10px";

  // Add event listeners
  debugButton.addEventListener("click", () => {
    debugToken();
  });

  clearButton.addEventListener("click", () => {
    if (
      confirm("Bạn có chắc muốn xóa token hiện tại? Bạn sẽ cần đăng nhập lại.")
    ) {
      clearTokenAndRedirect();
    }
  });

  // Add buttons to container
  debugContainer.appendChild(debugButton);
  debugContainer.appendChild(clearButton);

  // Add to sidebar
  const sidebar = document.querySelector(".profile-sidebar");
  if (sidebar) {
    sidebar.appendChild(debugContainer);
  }
}

// Debug token function
function debugToken() {
  const token = localStorage.getItem("auth_token");
  if (!token) {
    alert("Không tìm thấy token trong localStorage.");
    return;
  }

  // Check token format
  const tokenParts = token.split(".");
  if (tokenParts.length !== 3) {
    alert(
      `Token không đúng định dạng JWT! Bạn nên xóa token và đăng nhập lại.\n\nToken hiện tại (20 ký tự đầu): ${token.substring(
        0,
        20
      )}...`
    );
    return;
  }

  try {
    // Decode token payload (middle part)
    const payload = JSON.parse(atob(tokenParts[1]));

    // Calculate expiration
    const exp = payload.exp ? new Date(payload.exp * 1000) : null;
    const now = new Date();
    const isExpired = exp ? now > exp : "Không xác định";

    // Create info message
    const tokenInfo = `
    Token hợp lệ: ${tokenParts.length === 3 ? "Có" : "Không"}
    Token đã hết hạn: ${
      isExpired === true ? "Có" : isExpired === false ? "Không" : isExpired
    }
    ${exp ? `Thời gian hết hạn: ${exp.toLocaleString()}` : ""}
    User ID: ${payload.id || payload.user?.id || "Không tìm thấy"}
    Username: ${payload.username || payload.user?.username || "Không tìm thấy"}
    
    Định dạng: ${tokenParts.length} phần (cần 3 phần)
    `;

    alert(tokenInfo);
    console.log("Token payload:", payload);
  } catch (e) {
    alert(
      `Không thể decode token. Token có thể không hợp lệ.\nLỗi: ${e.message}`
    );
    console.error("Token decode error:", e);
  }
}

// Clear token and redirect to login
function clearTokenAndRedirect() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("user");
  localStorage.removeItem("token_timestamp");

  alert("Đã xóa token. Bạn sẽ được chuyển đến trang đăng nhập.");
  redirectToLogin();
}
