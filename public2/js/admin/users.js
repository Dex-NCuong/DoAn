// Admin Users Management

// Biến toàn cục cho phân trang
let currentPage = 1;
let totalPages = 1;
let pageSize = 10;
let roleFilter = "";
let statusFilter = "";
let searchKeyword = "";
let startDate = "";
let endDate = "";

// Admin API URL - using a different variable name to avoid conflicts
const ADMIN_API_URL = "/admin";

// DOM ready
document.addEventListener("DOMContentLoaded", function () {
  // Check if we're on the users page
  if (!document.getElementById("usersTableBody")) {
    return;
  }

  console.log("Admin users page initialized");

  // Tải danh sách người dùng
  loadUsers();

  // Set up search function
  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");

  if (searchInput && searchBtn) {
    searchBtn.addEventListener("click", function () {
      searchKeyword = searchInput.value.trim();
      currentPage = 1; // Reset to first page
      loadUsers();
    });

    searchInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        searchKeyword = searchInput.value.trim();
        currentPage = 1; // Reset to first page
        loadUsers();
      }
    });
  }

  // Set up role filter
  const roleFilterSelect = document.getElementById("roleFilter");
  if (roleFilterSelect) {
    roleFilterSelect.addEventListener("change", function () {
      roleFilter = this.value;
      currentPage = 1; // Reset to first page
      loadUsers();
    });
  }

  // Set up status filter
  const statusFilterSelect = document.getElementById("statusFilter");
  if (statusFilterSelect) {
    statusFilterSelect.addEventListener("change", function () {
      statusFilter = this.value;
      currentPage = 1; // Reset to first page
      loadUsers();
    });
  }

  // Lấy filter ngày
  const startDateInput = document.getElementById("startDate");
  const endDateInput = document.getElementById("endDate");
  if (startDateInput) {
    startDateInput.addEventListener("change", function () {
      startDate = this.value;
      currentPage = 1;
      loadUsers();
    });
  }
  if (endDateInput) {
    endDateInput.addEventListener("change", function () {
      endDate = this.value;
      currentPage = 1;
      loadUsers();
    });
  }

  // Nút Đặt lại
  const resetBtn = document.getElementById("resetFilterBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      document.getElementById("searchInput").value = "";
      document.getElementById("roleFilter").value = "";
      document.getElementById("statusFilter").value = "";
      if (startDateInput) startDateInput.value = "";
      if (endDateInput) endDateInput.value = "";
      searchKeyword = "";
      roleFilter = "";
      statusFilter = "";
      startDate = "";
      endDate = "";
      currentPage = 1;
      loadUsers();
    });
  }

  // Add user button
  const addUserBtn = document.getElementById("addUserBtn");
  if (addUserBtn) {
    addUserBtn.addEventListener("click", function () {
      // Open add user modal
      const modal = document.getElementById("addUserModal");
      if (modal) {
        // Reset form
        const form = document.getElementById("addUserForm");
        if (form) form.reset();

        // Show modal
        modal.style.display = "block";
      }
    });
  }

  // Init add user form submission
  const addUserForm = document.getElementById("addUserForm");
  if (addUserForm) {
    addUserForm.addEventListener("submit", function (e) {
      e.preventDefault();
      createUser();
    });
  }

  // Also add click handler for the create user button
  const createUserBtn = document.getElementById("createUserBtn");
  if (createUserBtn) {
    createUserBtn.addEventListener("click", function () {
      createUser();
    });
  }

  // Close modal buttons
  document.querySelectorAll(".close-modal").forEach((button) => {
    button.addEventListener("click", function () {
      const modal = this.closest(".modal");
      if (modal) modal.style.display = "none";
    });
  });

  // When user clicks outside modal
  window.addEventListener("click", function (event) {
    const modals = document.querySelectorAll(".modal");
    modals.forEach((modal) => {
      if (event.target === modal) {
        modal.style.display = "none";
      }
    });
  });
});

// Create new user
async function createUser() {
  try {
    // Get form data
    const username = document.getElementById("newUsername").value;
    const email = document.getElementById("newEmail").value;
    const password = document.getElementById("newPassword").value;
    const displayName =
      document.getElementById("newDisplayName").value || username;
    const role = document.getElementById("newRole").value || "user";
    const status = document.getElementById("newStatus")?.value || "active";

    // Validate
    if (!username || !email || !password) {
      alert("Vui lòng điền đầy đủ thông tin bắt buộc!");
      return;
    }

    // Create request data
    const userData = {
      username,
      email,
      password,
      displayName,
      role,
      status,
      coins: 0, // Luôn mặc định 0 khi tạo mới
    };

    // API call
    const response = await fetch(`${ADMIN_API_URL}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Failed to create user");
    }

    // Close modal
    const modal = document.getElementById("addUserModal");
    if (modal) modal.style.display = "none";

    // Show success message
    alert("Tạo người dùng mới thành công!");

    // Reload user list
    loadUsers();
  } catch (error) {
    console.error("Error creating user:", error);
    alert(`Lỗi: ${error.message}`);
  }
}

// Tải danh sách người dùng
async function loadUsers() {
  const tableBody = document.getElementById("usersTableBody");
  if (!tableBody) return;

  try {
    // Hiển thị loading
    tableBody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center">
          <div class="loading-spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </td>
      </tr>
    `;

    // API call to get users
    let url = `${ADMIN_API_URL}/users?page=${currentPage}&limit=${pageSize}&search=${searchKeyword}&role=${roleFilter}&status=${statusFilter}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    console.log("Calling API:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // Add auth header if needed
        Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Users data:", data);

    if (!data.success) {
      throw new Error(data.message || "Failed to load users");
    }

    const { users, pagination } = data.data;
    currentPage = pagination.currentPage;
    totalPages = pagination.totalPages;

    // Update counts
    document.getElementById("currentCount").textContent = users.length;
    document.getElementById("totalCount").textContent = pagination.totalItems;

    // Render người dùng
    renderUsers(users);

    // Render phân trang
    renderPagination();
  } catch (error) {
    console.error("Error loading users:", error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center text-danger">
          <i class="fas fa-exclamation-circle"></i> 
          Đã xảy ra lỗi khi tải dữ liệu người dùng: ${error.message}
        </td>
      </tr>
    `;
  }
}

// Render danh sách người dùng
function renderUsers(users) {
  const tableBody = document.getElementById("usersTableBody");
  if (!tableBody) return;

  if (!users || users.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center">
          Không tìm thấy người dùng nào
        </td>
      </tr>
    `;
    return;
  }

  let html = "";

  users.forEach((user) => {
    // Format date
    const createdDate = new Date(user.createdAt).toLocaleDateString("vi-VN");

    // Determine role display
    const roleClass = user.role === "admin" ? "badge-danger" : "badge-primary";
    const roleText = user.role === "admin" ? "Quản trị viên" : "Người dùng";

    // Determine status display
    let statusClass = user.status ? "badge-success" : "badge-danger";
    let statusText = user.status ? "Đang hoạt động" : "Bị cấm";

    // Avatar display
    const avatarSrc = user.avatar || "/uploads/avatars/default-avatar.jpg";

    html += `
      <tr>
        <td>${user.userId || user._id}</td>
        <td>
          <img src="${avatarSrc}" alt="Avatar" class="user-avatar-small" />
        </td>
        <td>${escapeHtml(user.username)}</td>
        <td>${escapeHtml(user.email)}</td>
        <td><span class="badge ${roleClass}">${roleText}</span></td>
        <td>${user.coins || 0}</td>
        <td>${createdDate}</td>
        <td><span class="badge ${statusClass}">${statusText}</span></td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-primary btn-sm edit-user" data-id="${
              user._id
            }" title="Sửa">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn ${
              user.status ? "btn-warning" : "btn-success"
            } btn-sm toggle-status" 
              data-id="${user._id}" 
              data-status="${user.status}"
              title="${user.status ? "Vô hiệu hóa" : "Kích hoạt"}">
              <i class="fas ${user.status ? "fa-ban" : "fa-check"}"></i>
            </button>
            <button class="btn btn-danger btn-sm delete-user" data-id="${
              user._id
            }" title="Xóa">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tableBody.innerHTML = html;

  // Add event listeners to buttons
  attachButtonEvents();
}

// Attach button event listeners
function attachButtonEvents() {
  // Edit user buttons
  document.querySelectorAll(".edit-user").forEach((button) => {
    button.addEventListener("click", function () {
      const userId = this.getAttribute("data-id");
      window.location.href = `add-user.html?userId=${userId}`;
    });
  });

  // Toggle status buttons
  document.querySelectorAll(".toggle-status").forEach((button) => {
    button.addEventListener("click", function () {
      const userId = this.getAttribute("data-id");
      const currentStatus = this.getAttribute("data-status") === "true";

      if (
        confirm(
          `Bạn có chắc muốn ${
            currentStatus ? "vô hiệu hóa" : "kích hoạt"
          } người dùng này?`
        )
      ) {
        toggleUserStatus(userId, !currentStatus);
      }
    });
  });

  // Delete user buttons
  document.querySelectorAll(".delete-user").forEach((button) => {
    button.addEventListener("click", function () {
      const userId = this.getAttribute("data-id");

      if (
        confirm(
          "Bạn có chắc muốn xóa người dùng này? Hành động này không thể hoàn tác."
        )
      ) {
        deleteUser(userId);
      }
    });
  });
}

// Open edit user modal
async function openEditUserModal(userId) {
  try {
    // Get user details
    const response = await fetch(`${ADMIN_API_URL}/users/${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Failed to get user details");
    }

    const user = data.data;

    // Populate form
    const form = document.getElementById("userDetailForm");
    if (!form) return;

    // Set user ID
    const userIdField = document.getElementById("userId");
    if (userIdField) userIdField.value = user._id;

    // Set username
    const usernameField = document.getElementById("username");
    if (usernameField) usernameField.value = user.username;

    // Set display name
    const displayNameField = document.getElementById("displayName");
    if (displayNameField)
      displayNameField.value = user.displayName || user.username;

    // Set email
    const emailField = document.getElementById("email");
    if (emailField) emailField.value = user.email;

    // Set role
    const roleField = document.getElementById("role");
    if (roleField) roleField.value = user.role || "user";

    // Set coins
    const coinsField = document.getElementById("coins");
    if (coinsField) coinsField.value = user.coins || 0;

    // Set status
    const statusField = document.getElementById("status");
    if (statusField) statusField.value = user.status ? "active" : "inactive";

    // Set created date
    const createdAtField = document.getElementById("createdAt");
    if (createdAtField) {
      const createdDate = new Date(user.createdAt).toLocaleString("vi-VN");
      createdAtField.value = createdDate;
    }

    // Set avatar
    const userAvatar = document.getElementById("userAvatar");
    if (userAvatar) {
      userAvatar.src = user.avatar || "/uploads/avatars/default-avatar.jpg";
    }

    // Change modal title
    const modalTitle = document.querySelector(
      "#userDetailModal .modal-header h3"
    );
    if (modalTitle) modalTitle.textContent = "Chỉnh sửa người dùng";

    // Set up save button
    const saveBtn = document.getElementById("saveUserBtn");
    if (saveBtn) {
      saveBtn.onclick = function () {
        saveUser(userId);
      };
    }

    // Set up reset password button
    const resetPasswordBtn = document.getElementById("resetPasswordBtn");
    if (resetPasswordBtn) {
      resetPasswordBtn.onclick = function () {
        resetUserPassword(userId);
      };
    }

    // Show modal
    const modal = document.getElementById("userDetailModal");
    if (modal) modal.style.display = "block";
  } catch (error) {
    console.error("Error opening edit user modal:", error);
    alert(`Lỗi: ${error.message}`);
  }
}

// Save user changes
async function saveUser(userId) {
  try {
    // Get form data
    const form = document.getElementById("userDetailForm");
    if (!form) return;

    const displayName = document.getElementById("displayName").value;
    const email = document.getElementById("email").value;
    const role = document.getElementById("role").value;
    const coins = parseInt(document.getElementById("coins").value);
    const status = document.getElementById("status").value === "active";

    // Validate
    if (!email || !displayName) {
      alert("Vui lòng điền đầy đủ thông tin!");
      return;
    }

    // Create request data
    const userData = {
      displayName,
      email,
      role,
      coins,
      status,
    };

    // API call
    const response = await fetch(`${ADMIN_API_URL}/users/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Failed to update user");
    }

    // Close modal
    const modal = document.getElementById("userDetailModal");
    if (modal) modal.style.display = "none";

    // Show success message
    alert("Cập nhật thông tin người dùng thành công!");

    // Reload user list
    loadUsers();
  } catch (error) {
    console.error("Error saving user:", error);
    alert(`Lỗi: ${error.message}`);
  }
}

// Toggle user status
async function toggleUserStatus(userId, newStatus) {
  try {
    // API call
    const response = await fetch(`${ADMIN_API_URL}/users/${userId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
      },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Failed to toggle user status");
    }

    // Show success message
    alert(data.message || "Thay đổi trạng thái người dùng thành công!");

    // Reload user list
    loadUsers();
  } catch (error) {
    console.error("Error toggling user status:", error);
    alert(`Lỗi: ${error.message}`);
  }
}

// Delete user
async function deleteUser(userId) {
  try {
    // API call
    const response = await fetch(`${ADMIN_API_URL}/users/${userId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Failed to delete user");
    }

    // Show success message
    alert("Xóa người dùng thành công!");

    // Reload user list
    loadUsers();
  } catch (error) {
    console.error("Error deleting user:", error);
    alert(`Lỗi: ${error.message}`);
  }
}

// Reset user password
async function resetUserPassword(userId) {
  try {
    // Confirm with admin
    if (!confirm("Bạn có chắc muốn đặt lại mật khẩu cho người dùng này?")) {
      return;
    }

    // API call
    const response = await fetch(
      `${ADMIN_API_URL}/users/${userId}/reset-password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Failed to reset password");
    }

    // Show success message with the new password
    alert(
      `Đặt lại mật khẩu thành công! Mật khẩu mới: ${data.data.newPassword}`
    );
  } catch (error) {
    console.error("Error resetting password:", error);
    alert(`Lỗi: ${error.message}`);
  }
}

// Render pagination
function renderPagination() {
  const paginationContainer = document.getElementById("pagination");
  if (!paginationContainer) return;

  if (totalPages <= 1) {
    paginationContainer.innerHTML = "";
    return;
  }

  let html = "";

  // Previous button
  html += `
    <button class="pagination-btn ${currentPage === 1 ? "disabled" : ""}" 
      ${
        currentPage === 1
          ? "disabled"
          : `onclick="changePage(${currentPage - 1})"`
      }>
      <i class="fas fa-chevron-left"></i>
    </button>
  `;

  // Page numbers
  const pagesToShow = 5;
  let startPage = Math.max(1, currentPage - Math.floor(pagesToShow / 2));
  let endPage = Math.min(totalPages, startPage + pagesToShow - 1);

  // Adjust startPage if needed
  if (endPage - startPage + 1 < pagesToShow) {
    startPage = Math.max(1, endPage - pagesToShow + 1);
  }

  // First page
  if (startPage > 1) {
    html += `<button class="pagination-btn" onclick="changePage(1)">1</button>`;
    if (startPage > 2) {
      html += `<span class="pagination-ellipsis">...</span>`;
    }
  }

  // Page buttons
  for (let i = startPage; i <= endPage; i++) {
    html += `
      <button class="pagination-btn ${i === currentPage ? "active" : ""}" 
        onclick="changePage(${i})">
        ${i}
      </button>
    `;
  }

  // Last page
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      html += `<span class="pagination-ellipsis">...</span>`;
    }
    html += `<button class="pagination-btn" onclick="changePage(${totalPages})">${totalPages}</button>`;
  }

  // Next button
  html += `
    <button class="pagination-btn ${
      currentPage === totalPages ? "disabled" : ""
    }" 
      ${
        currentPage === totalPages
          ? "disabled"
          : `onclick="changePage(${currentPage + 1})"`
      }>
      <i class="fas fa-chevron-right"></i>
    </button>
  `;

  paginationContainer.innerHTML = html;
}

// Change page
function changePage(page) {
  if (page < 1 || page > totalPages) return;

  currentPage = page;
  loadUsers();

  // Scroll to top of table
  const table = document.querySelector(".admin-table");
  if (table) {
    table.scrollIntoView({ behavior: "smooth" });
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
