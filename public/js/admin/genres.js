// Admin Genres Management

// Variables
let currentPage = 1;
let totalPages = 1;
let genres = [];
let editingGenreId = null;
const ITEMS_PER_PAGE = 10;

// Utility functions
function showLoadingSpinner() {
  const tableBody = document.getElementById("genreList");
  if (!tableBody) {
    console.error("Không tìm thấy phần tử #genreList");
    return;
  }

  tableBody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Đang tải...</span>
        </div>
        <p class="mt-2">Đang tải danh sách thể loại...</p>
      </td>
    </tr>
  `;
}

function hideLoadingSpinner() {
  // This function doesn't need to do anything specific
  // because renderGenres() will replace the content anyway
}

function showErrorMessage(message) {
  showMessage(message, "error");
}

// DOM ready
document.addEventListener("DOMContentLoaded", function () {
  // Kiểm tra quyền admin
  if (!checkAdminAuth()) return;

  console.log("DOM loaded for genres page");

  // Log các element quan trọng
  console.log("genreModal exists:", !!document.getElementById("genreModal"));
  console.log("modalTitle exists:", !!document.getElementById("modalTitle"));
  console.log("addGenreBtn exists:", !!document.getElementById("addGenreBtn"));
  console.log("genreForm exists:", !!document.getElementById("genreForm"));

  // Tải danh sách thể loại
  loadGenres(1);

  // Khởi tạo sự kiện tìm kiếm
  initSearchFilter();

  // Khởi tạo sự kiện cho form thể loại
  const genreForm = document.getElementById("genreForm");
  if (genreForm) {
    genreForm.addEventListener("submit", (e) => {
      e.preventDefault();
      saveGenre();
    });
  }

  // Khởi tạo nút hủy
  const cancelBtn = document.getElementById("cancelBtn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", closeGenreModal);
  }

  // Khởi tạo nút hủy xóa
  const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener("click", closeDeleteModal);
  }
});

// Render danh sách thể loại
function renderGenres(genres) {
  const tableBody = document.getElementById("genreList");
  if (!tableBody) {
    console.error("Không tìm thấy phần tử #genreList");
    return;
  }

  tableBody.innerHTML = "";

  if (!genres || genres.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center">Không có thể loại nào</td>
      </tr>
    `;
    return;
  }

  genres.forEach((genre) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${genre._id.substring(0, 6)}</td>
      <td>${genre.name}</td>
      <td>${genre.description || "Không có mô tả"}</td>
      <td>${genre.storyCount || 0} truyện</td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-sm btn-primary edit-genre" onclick="openEditGenreModal('${
            genre._id
          }')">
            <i class="fas fa-edit"></i> Sửa
          </button>
          <button class="btn btn-sm btn-danger delete-genre" onclick="openDeleteModal('${
            genre._id
          }', '${genre.name}')">
            <i class="fas fa-trash"></i> Xóa
          </button>
        </div>
      </td>
    `;
    tableBody.appendChild(row);
  });

  // Thêm event listeners cho các nút sau khi render
  addButtonEventListeners();
}

// Thêm event listeners cho các nút
function addButtonEventListeners() {
  // Event listeners cho nút sửa
  document.querySelectorAll(".edit-genre").forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();
      const genreId = this.getAttribute("onclick").match(/'([^']+)'/)[1];
      openEditGenreModal(genreId);
    });
  });

  // Event listeners cho nút xóa
  document.querySelectorAll(".delete-genre").forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();
      const onclick = this.getAttribute("onclick");
      const matches = onclick.match(/'([^']+)'/g);
      const genreId = matches[0].replace(/'/g, "");
      const genreName = matches[1].replace(/'/g, "");
      openDeleteModal(genreId, genreName);
    });
  });
}

// Tải danh sách thể loại
async function loadGenres(page = 1) {
  try {
    showLoadingSpinner();
    const searchTerm = document.getElementById("searchGenre")?.value || "";

    const response = await fetch(
      `/api/genres?page=${page}&limit=${ITEMS_PER_PAGE}&search=${encodeURIComponent(
        searchTerm
      )}`
    );
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Failed to load genres");
    }

    const { genres: genresList, pagination } = data.data;
    genres = genresList; // Cập nhật biến global
    renderGenres(genres);
    updatePagination(pagination);
    hideLoadingSpinner();
  } catch (error) {
    console.error("Error loading genres:", error);
    showErrorMessage("Không thể tải danh sách thể loại");
    hideLoadingSpinner();
  }
}

function updatePagination(pagination) {
  const paginationContainer = document.querySelector("#pagination");
  paginationContainer.innerHTML = "";

  if (!pagination || pagination.totalPages <= 1) {
    return;
  }

  const { page, totalPages } = pagination;
  currentPage = page;

  // Previous button
  const prevButton = document.createElement("button");
  prevButton.className = `btn btn-outline-primary me-2 ${
    page === 1 ? "disabled" : ""
  }`;
  prevButton.innerHTML = "&laquo; Trước";
  if (page > 1) {
    prevButton.onclick = () => loadGenres(page - 1);
  }
  paginationContainer.appendChild(prevButton);

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    const pageButton = document.createElement("button");
    pageButton.className = `btn me-2 ${
      i === page ? "btn-primary active" : "btn-outline-primary"
    }`;
    pageButton.textContent = i;
    pageButton.onclick = () => loadGenres(i);
    paginationContainer.appendChild(pageButton);
  }

  // Next button
  const nextButton = document.createElement("button");
  nextButton.className = `btn btn-outline-primary ${
    page === totalPages ? "disabled" : ""
  }`;
  nextButton.innerHTML = "Sau &raquo;";
  if (page < totalPages) {
    nextButton.onclick = () => loadGenres(page + 1);
  }
  paginationContainer.appendChild(nextButton);
}

// Đóng modal thêm/sửa thể loại
function closeGenreModal() {
  if (window.genreModal) {
    window.genreModal.hide();
    resetGenreForm();
    editingGenreId = null;
  }
}

// Đóng modal xác nhận xóa
function closeDeleteModal() {
  if (window.deleteModal) {
    window.deleteModal.hide();
  }
}

// Mở modal chỉnh sửa thể loại
function openEditGenreModal(genreId) {
  const genre = genres.find((g) => g._id === genreId);
  if (!genre) return;

  const modalTitle = document.getElementById("modalTitle");
  const form = document.getElementById("genreForm");

  if (modalTitle && form) {
    modalTitle.textContent = "Chỉnh sửa thể loại";
    document.getElementById("genreId").value = genre._id;
    document.getElementById("name").value = genre.name;
    document.getElementById("description").value = genre.description || "";

    editingGenreId = genre._id;

    // Show modal using Bootstrap instance
    if (window.genreModal) {
      window.genreModal.show();
    }
  }
}

// Reset form thể loại
function resetGenreForm() {
  const form = document.getElementById("genreForm");
  if (form) {
    form.reset();
    document.getElementById("genreId").value = "";
  }
}

// Lưu thể loại
async function saveGenre() {
  const form = document.getElementById("genreForm");
  const saveBtn = document.getElementById("saveGenreBtn");

  if (!form || !saveBtn) return;

  try {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';

    const genreData = {
      name: document.getElementById("name").value.trim(),
      description: document.getElementById("description").value.trim(),
    };

    if (!genreData.name) {
      throw new Error("Vui lòng nhập tên thể loại");
    }

    const method = editingGenreId ? "PUT" : "POST";
    const url = editingGenreId
      ? `/api/genres/${editingGenreId}`
      : "/api/genres";

    const response = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(genreData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || `Lỗi ${response.status}: ${response.statusText}`
      );
    }

    showMessage(
      editingGenreId
        ? "Cập nhật thể loại thành công!"
        : "Thêm thể loại mới thành công!"
    );
    closeGenreModal();
    await loadGenres(currentPage);
  } catch (error) {
    console.error("Lỗi khi lưu thể loại:", error);
    showMessage(error.message || "Lỗi khi lưu thể loại", "error");
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = "Lưu thể loại";
  }
}

// Mở modal xác nhận xóa
function openDeleteModal(genreId, genreName) {
  const genreTitleEl = document.getElementById("deleteGenreTitle");
  const confirmBtn = document.getElementById("confirmDeleteBtn");

  if (genreTitleEl && confirmBtn) {
    genreTitleEl.textContent = genreName;
    confirmBtn.onclick = () => deleteGenre(genreId);

    // Show modal using Bootstrap instance
    if (window.deleteModal) {
      window.deleteModal.show();
    }
  }
}

// Xóa thể loại
async function deleteGenre(genreId) {
  if (!genreId) {
    showMessage("Không tìm thấy ID thể loại cần xóa", "error");
    return;
  }

  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
  if (!confirmDeleteBtn) return;

  try {
    confirmDeleteBtn.disabled = true;
    confirmDeleteBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Đang xóa...';

    const response = await fetch(`/api/genres/${genreId}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(
        result.message || `Lỗi ${response.status}: ${response.statusText}`
      );
    }

    showMessage("Xóa thể loại thành công!");
    closeDeleteModal();
    await loadGenres(currentPage);
  } catch (error) {
    console.error("Lỗi khi xóa thể loại:", error);
    showMessage(error.message || "Lỗi khi xóa thể loại", "error");
  } finally {
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.innerHTML = "Xóa";
  }
}

// Khởi tạo bộ lọc tìm kiếm
function initSearchFilter() {
  const searchInput = document.getElementById("searchGenre");
  if (searchInput) {
    searchInput.addEventListener(
      "input",
      debounce(() => {
        loadGenres(1);
      }, 300)
    );
  }
}

// Debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Hiển thị thông báo
function showMessage(message, type = "success") {
  const messageContainer = document.getElementById("messageContainer");
  const messageText = document.getElementById("messageText");

  if (!messageContainer || !messageText) {
    console.error("Không tìm thấy container thông báo");
    alert(message); // Fallback to alert if message elements not found
    return;
  }

  // Thiết lập loại thông báo
  messageContainer.className = "admin-message";
  if (type === "error") {
    messageContainer.classList.add("error");
    messageContainer.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
  } else {
    messageContainer.classList.add("success");
    messageContainer.innerHTML = '<i class="fas fa-check-circle"></i>';
  }

  // Thêm nội dung thông báo
  const messageSpan = document.createElement("span");
  messageSpan.id = "messageText";
  messageSpan.textContent = message;
  messageContainer.appendChild(messageSpan);

  // Hiển thị thông báo
  messageContainer.classList.add("show");

  // Tự động ẩn sau 3 giây
  setTimeout(() => {
    messageContainer.classList.remove("show");
  }, 3000);
}

// Khởi tạo trang
function initializePage() {
  console.log("Initializing genres page...");

  // Kiểm tra quyền admin
  if (!checkAdminAuth()) return;

  console.log("Admin authentication successful");

  // Log các element quan trọng
  console.log("genreList exists:", !!document.getElementById("genreList"));
  console.log("genreModal exists:", !!document.getElementById("genreModal"));
  console.log("modalTitle exists:", !!document.getElementById("modalTitle"));
  console.log("addGenreBtn exists:", !!document.getElementById("addGenreBtn"));
  console.log("genreForm exists:", !!document.getElementById("genreForm"));

  // Tải danh sách thể loại
  loadGenres(1);

  // Khởi tạo sự kiện tìm kiếm
  initSearchFilter();

  // Khởi tạo sự kiện cho form thể loại
  const genreForm = document.getElementById("genreForm");
  if (genreForm) {
    genreForm.addEventListener("submit", (e) => {
      e.preventDefault();
      saveGenre();
    });
  }

  // Khởi tạo nút hủy
  const cancelBtn = document.getElementById("cancelBtn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", closeGenreModal);
  }

  // Khởi tạo nút hủy xóa
  const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener("click", closeDeleteModal);
  }
}

// Đảm bảo DOM đã được tải hoàn toàn trước khi khởi tạo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializePage);
} else {
  initializePage();
}
