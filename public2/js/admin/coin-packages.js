// Các biến toàn cục
let coinPackages = [];
let currentPage = 1;
const itemsPerPage = 10;
let totalPages = 1;
let currentFilter = "all";
let currentSearch = "";

// DOM Elements
const packageModal = document.getElementById("coinPackageModal");
const deleteModal = document.getElementById("deleteConfirmModal");
const packageForm = document.getElementById("coin-package-form");
const packagesList = document.getElementById("coin-packages-list");
const modalTitle = document.getElementById("modal-title");
const paginationInfo = document.getElementById("pagination-info");
const currentPageEl = document.getElementById("current-page");
const prevPageBtn = document.getElementById("prev-page");
const nextPageBtn = document.getElementById("next-page");
const statusFilter = document.getElementById("status-filter");
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const resetBtn = document.getElementById("reset-btn");

// Kiểm tra và chuyển hướng nếu không phải admin
document.addEventListener("DOMContentLoaded", async () => {
  // Debug authentication
  const token = localStorage.getItem("auth_token");
  console.log(
    "Auth token exists:",
    !!token,
    "Length:",
    token ? token.length : 0
  );
  if (token) {
    console.log("Token starts with:", token.substring(0, 10) + "...");
  }

  const userJson = localStorage.getItem("user");
  console.log("User data exists:", !!userJson);
  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      console.log("User role:", user.role);
    } catch (e) {
      console.error("Error parsing user data:", e);
    }
  }

  // Kiểm tra xác thực
  if (typeof isAuthenticated === "function") {
    if (!isAuthenticated()) {
      window.location.href = "../login.html?redirect=admin/coin-packages.html";
      return;
    }
  } else {
    // Fallback check if function isn't available
    if (!token) {
      window.location.href = "../login.html?redirect=admin/coin-packages.html";
      return;
    }
  }

  // Kiểm tra admin (tạm thời bỏ qua trong quá trình phát triển)
  // if (!isAdmin()) {
  //   window.location.href = '../index.html';
  //   return;
  // }

  // Hiển thị username của admin
  if (typeof displayAdminUsername === "function") {
    displayAdminUsername();
  } else {
    const adminUsername = document.getElementById("admin-username");
    if (adminUsername) {
      let currentUser;

      if (typeof getCurrentUser === "function") {
        currentUser = getCurrentUser();
      } else {
        // Fallback if function is not available
        const userJson = localStorage.getItem("user");
        if (userJson) {
          try {
            currentUser = JSON.parse(userJson);
          } catch (error) {
            console.error("Error parsing user JSON:", error);
          }
        }
      }

      if (currentUser) {
        adminUsername.textContent = currentUser.username;
      }
    }
  }

  // Xử lý đăng xuất
  const logoutBtn = document.getElementById("admin-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function (e) {
      e.preventDefault();
      if (typeof logout === "function") {
        logout();
      } else {
        // Fallback logout implementation
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user");
        window.location.href = "/login.html";
      }
    });
  }

  // Tải dữ liệu gói xu
  await loadCoinPackages();

  // Đăng ký sự kiện
  registerEventHandlers();
});

// Load danh sách gói xu
async function loadCoinPackages() {
  try {
    // Check if auth token exists before making the request
    const token = getAuthToken();
    if (!token) {
      packagesList.innerHTML = `
        <tr>
          <td colspan="8" class="text-center text-danger">
            Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn. 
            <a href="/login.html?redirect=${encodeURIComponent(
              window.location.pathname
            )}">Đăng nhập lại</a>
          </td>
        </tr>`;
      return;
    }

    const url = `/api/coin-packages/admin?page=${currentPage}&limit=${itemsPerPage}&status=${currentFilter}&search=${encodeURIComponent(
      currentSearch
    )}`;

    console.log("Loading packages from:", url);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Handle unauthorized error specifically
    if (response.status === 401) {
      packagesList.innerHTML = `
        <tr>
          <td colspan="8" class="text-center text-danger">
            Phiên đăng nhập đã hết hạn. 
            <a href="/login.html?redirect=${encodeURIComponent(
              window.location.pathname
            )}">Đăng nhập lại</a>
          </td>
        </tr>`;
      return;
    }

    // Check if response is JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error(
        "Server trả về không phải dạng JSON. Vui lòng kiểm tra lại API endpoint và server logs."
      );
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Không thể tải dữ liệu gói xu");
    }

    const data = await response.json();

    coinPackages = data.packages || [];
    const total = data.total || 0;
    totalPages = Math.ceil(total / itemsPerPage);

    renderCoinPackages();
    updatePagination(total);
  } catch (error) {
    console.error("Lỗi khi tải gói xu:", error);
    packagesList.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Lỗi: ${error.message}</td></tr>`;
  }
}

// Hiển thị danh sách gói xu
function renderCoinPackages() {
  if (coinPackages.length === 0) {
    packagesList.innerHTML =
      '<tr><td colspan="8" class="text-center">Không có gói xu nào</td></tr>';
    return;
  }

  packagesList.innerHTML = coinPackages
    .map(
      (pkg) => `
    <tr>
      <td>${pkg.packageId || pkg._id}</td>
      <td>${pkg.name}</td>
      <td>${pkg.coins}</td>
      <td>${formatCurrency(pkg.price)}</td>
      <td>${pkg.discount || 0}%</td>
      <td>
        <span class="badge ${
          pkg.status === "active" ? "badge-success" : "badge-secondary"
        }">
          ${pkg.status === "active" ? "Hoạt động" : "Không hoạt động"}
        </span>
        ${
          pkg.featured
            ? '<span class="badge badge-warning ml-1">Nổi bật</span>'
            : ""
        }
      </td>
      <td>${formatDate(pkg.createdAt)}</td>
      <td>
        <button class="btn btn-sm btn-info edit-package" data-id="${
          pkg.packageId || pkg._id
        }">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-danger delete-package" data-id="${
          pkg._id
        }">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `
    )
    .join("");

  // Đăng ký sự kiện cho các nút chỉnh sửa và xóa
  document.querySelectorAll(".edit-package").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.location.href = `coin-package-add.html?id=${btn.dataset.id}`;
    });
  });

  document.querySelectorAll(".delete-package").forEach((btn) => {
    btn.addEventListener("click", () => {
      const packageId = btn.dataset.id;
      if (
        confirm(
          "Bạn có chắc chắn muốn xóa gói xu này? Hành động này không thể hoàn tác."
        )
      ) {
        deletePackage(packageId);
      }
    });
  });
}

// Cập nhật thông tin phân trang
function updatePagination(total) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, total);

  paginationInfo.textContent = `Đang hiển thị ${
    total > 0 ? startItem : 0
  } - ${endItem} của ${total} gói xu`;
  currentPageEl.textContent = `Trang ${currentPage}`;

  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = currentPage >= totalPages;
}

// Mở modal thêm gói xu mới
function openAddModal() {
  modalTitle.textContent = "Thêm gói xu mới";
  packageForm.reset();
  document.getElementById("package-id").value = "";
  document.getElementById("package-status").value = "active";
  packageModal.style.display = "block";
}

// Mở modal chỉnh sửa gói xu
async function openEditModal(packageId) {
  try {
    // Check if auth token exists before making the request
    const token = getAuthToken();
    if (!token) {
      alert(
        "Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
      );
      window.location.href =
        "/login.html?redirect=" + encodeURIComponent(window.location.pathname);
      return;
    }

    modalTitle.textContent = "Chỉnh sửa gói xu";

    const response = await fetch(`/api/coin-packages/${packageId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Handle unauthorized error specifically
    if (response.status === 401) {
      alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      window.location.href =
        "/login.html?redirect=" + encodeURIComponent(window.location.pathname);
      return;
    }

    // Check if response is JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error(
        "Server trả về không phải dạng JSON. Vui lòng kiểm tra lại API endpoint và server logs."
      );
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Không thể tải thông tin gói xu");
    }

    const pkg = await response.json();

    document.getElementById("package-id").value = pkg._id;
    document.getElementById("package-name").value = pkg.name;
    document.getElementById("package-coins").value = pkg.coins;
    document.getElementById("package-price").value = pkg.price;
    document.getElementById("package-discount").value = pkg.discount || "";
    document.getElementById("package-description").value =
      pkg.description || "";
    document.getElementById("package-status").value = pkg.status || "active";
    document.getElementById("package-featured").checked = pkg.featured || false;

    packageModal.style.display = "block";
  } catch (error) {
    console.error("Lỗi khi tải thông tin gói xu:", error);
    alert("Không thể tải thông tin gói xu. Vui lòng thử lại sau.");
  }
}

// Xóa gói xu
async function deletePackage(packageId) {
  try {
    // Check if auth token exists before making the request
    const token = getAuthToken();
    if (!token) {
      alert(
        "Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
      );
      window.location.href =
        "/login.html?redirect=" + encodeURIComponent(window.location.pathname);
      return;
    }

    const response = await fetch(`/api/coin-packages/${packageId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Handle unauthorized error specifically
    if (response.status === 401) {
      alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      window.location.href =
        "/login.html?redirect=" + encodeURIComponent(window.location.pathname);
      return;
    }

    // Check if response is JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error(
        "Server trả về không phải dạng JSON. Vui lòng kiểm tra lại API endpoint và server logs."
      );
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Không thể xóa gói xu");
    }

    await loadCoinPackages();

    // Hiển thị thông báo thành công
    alert("Xóa gói xu thành công");
  } catch (error) {
    console.error("Lỗi khi xóa gói xu:", error);
    alert(`Lỗi: ${error.message}`);
  }
}

// Đăng ký các sự kiện
function registerEventHandlers() {
  // Nút thêm gói xu
  const addBtn = document.getElementById("add-package-btn");
  if (addBtn) {
    addBtn.addEventListener("click", function () {
      window.location.href = "coin-package-add.html";
    });
  }

  // Nút lưu gói xu (chỉ có ở trang thêm/sửa)
  const saveBtn = document.getElementById("save-package");
  if (saveBtn) {
    saveBtn.addEventListener("click", savePackage);
  }

  // Nút xác nhận xóa (chỉ có ở modal đã bị xóa)
  const confirmDeleteBtn = document.getElementById("confirm-delete");
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", deletePackage);
  }

  // Đóng modal (chỉ có ở modal đã bị xóa)
  const closeEls = document.querySelectorAll(".close, .close-modal");
  if (closeEls.length > 0) {
    closeEls.forEach((el) => {
      el.addEventListener("click", () => {
        if (typeof packageModal !== "undefined" && packageModal)
          packageModal.style.display = "none";
        if (typeof deleteModal !== "undefined" && deleteModal)
          deleteModal.style.display = "none";
      });
    });
  }

  // Phân trang
  if (prevPageBtn) {
    prevPageBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        loadCoinPackages();
      }
    });
  }
  if (nextPageBtn) {
    nextPageBtn.addEventListener("click", () => {
      if (currentPage < totalPages) {
        currentPage++;
        loadCoinPackages();
      }
    });
  }

  // Lọc theo trạng thái
  if (statusFilter) {
    statusFilter.addEventListener("change", () => {
      currentFilter = statusFilter.value;
      currentPage = 1;
      loadCoinPackages();
    });
  }

  // Tìm kiếm
  if (searchInput) {
    // Bấm Enter trên input sẽ tìm kiếm
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        currentSearch = searchInput.value.trim();
        currentPage = 1;
        loadCoinPackages();
      }
    });
  }
  if (searchBtn && searchInput) {
    searchBtn.addEventListener("click", () => {
      currentSearch = searchInput.value.trim();
      currentPage = 1;
      loadCoinPackages();
    });
  }
  if (resetBtn && searchInput) {
    resetBtn.addEventListener("click", () => {
      searchInput.value = "";
      currentSearch = "";
      currentPage = 1;
      if (statusFilter) statusFilter.value = "all";
      currentFilter = "all";
      loadCoinPackages();
    });
  }

  // Đóng modal khi click bên ngoài (chỉ có ở modal đã bị xóa)
  window.addEventListener("click", (event) => {
    if (
      typeof packageModal !== "undefined" &&
      packageModal &&
      event.target === packageModal
    ) {
      packageModal.style.display = "none";
    }
    if (
      typeof deleteModal !== "undefined" &&
      deleteModal &&
      event.target === deleteModal
    ) {
      deleteModal.style.display = "none";
    }
  });
}

// Hàm tiện ích
function formatCurrency(amount) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

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

// Lấy token xác thực từ localStorage
function getAuthToken() {
  const token = localStorage.getItem("auth_token");
  if (!token) {
    console.warn("No auth token found in localStorage");
    // If we're on the admin page without a token, redirect to login
    if (window.location.pathname.includes("/admin/")) {
      window.location.href =
        "/login.html?redirect=" + encodeURIComponent(window.location.pathname);
    }
  }
  return token || "";
}
