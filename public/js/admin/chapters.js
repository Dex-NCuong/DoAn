// Admin Chapters Management

// Kiểm tra quyền admin
function checkAdminAuth() {
  // Thêm logic kiểm tra quyền admin ở đây
  // Tạm thời luôn trả về true để phát triển
  return true;
}

// Escape HTML để tránh XSS
function escapeHtml(text) {
  if (!text) return "";
  return text
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Format date
function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Tạo phân trang
function createPagination(currentPage, totalPages, onPageChange) {
  let html = '<ul class="pagination">';

  // Nút Previous
  if (currentPage > 1) {
    html += `<li class="page-item"><a class="page-link" href="#" data-page="${
      currentPage - 1
    }">«</a></li>`;
  } else {
    html +=
      '<li class="page-item disabled"><span class="page-link">«</span></li>';
  }

  // Các trang
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, startPage + 4);

  for (let i = startPage; i <= endPage; i++) {
    if (i === currentPage) {
      html += `<li class="page-item active"><span class="page-link">${i}</span></li>`;
    } else {
      html += `<li class="page-item"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
    }
  }

  // Nút Next
  if (currentPage < totalPages) {
    html += `<li class="page-item"><a class="page-link" href="#" data-page="${
      currentPage + 1
    }">»</a></li>`;
  } else {
    html +=
      '<li class="page-item disabled"><span class="page-link">»</span></li>';
  }

  html += "</ul>";

  // Thêm sự kiện click cho các nút phân trang
  setTimeout(() => {
    document
      .querySelectorAll(".pagination .page-link:not(.disabled)")
      .forEach((link) => {
        link.addEventListener("click", function (e) {
          e.preventDefault();
          const page = parseInt(this.dataset.page);
          if (onPageChange && typeof onPageChange === "function") {
            onPageChange(page);
          }
        });
      });
  }, 0);

  return html;
}

// Biến toàn cục cho phân trang và lọc
let currentPage = 1;
let totalPages = 1;
let pageSize = 10;
let filterStatus = "all";
let filterStory = "";
let searchKeyword = "";

// DOM ready
document.addEventListener("DOMContentLoaded", function () {
  // Kiểm tra quyền admin
  if (!checkAdminAuth()) return;

  // Khởi tạo bộ lọc
  initFilters();

  // Khởi tạo sự kiện cho modal xem chi tiết
  initChapterDetailModal();

  // Khởi tạo sự kiện cho nút thêm chương
  initAddChapterButton();

  // Tải danh sách chương
  loadChapters();
});

// Khởi tạo bộ lọc
function initFilters() {
  // Bộ lọc trạng thái
  const statusFilter = document.getElementById("chapter-status-filter");
  if (statusFilter) {
    statusFilter.addEventListener("change", function () {
      filterStatus = this.value;
      currentPage = 1; // Reset về trang đầu
      loadChapters();
    });
  }

  // Bộ lọc truyện
  const storyFilter = document.getElementById("chapter-story-filter");
  if (storyFilter) {
    // Tải danh sách truyện
    loadStoriesForFilter(storyFilter);

    storyFilter.addEventListener("change", function () {
      filterStory = this.value;
      currentPage = 1; // Reset về trang đầu
      loadChapters();
    });
  }

  // Thanh tìm kiếm
  const searchInput = document.getElementById("chapter-search");
  if (searchInput) {
    // Dùng debounce để tránh gọi quá nhiều request khi người dùng gõ
    const debounceSearch = debounce(function () {
      searchKeyword = searchInput.value.trim();
      currentPage = 1; // Reset về trang đầu
      loadChapters();
    }, 500);

    searchInput.addEventListener("input", debounceSearch);
  }
}

// Tải danh sách truyện cho select filter
async function loadStoriesForFilter(selectElement) {
  if (!selectElement) return;

  try {
    // Gọi API để lấy danh sách truyện
    const response = await fetch("/api/stories/admin/list", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Kiểm tra cấu trúc dữ liệu trả về
    if (!data.success) {
      throw new Error(data.message || "Không thể tải danh sách truyện");
    }

    const stories = data.stories || [];

    // Thêm option "Tất cả truyện"
    let html = `<option value="">Tất cả truyện</option>`;

    // Thêm các truyện
    stories.forEach((story) => {
      html += `<option value="${story._id}">${escapeHtml(
        story.title
      )}</option>`;
    });

    selectElement.innerHTML = html;
  } catch (error) {
    console.error("Lỗi khi tải danh sách truyện cho bộ lọc:", error);
    // Hiển thị thông báo lỗi và vẫn cho phép người dùng chọn tất cả
    selectElement.innerHTML = `<option value="">Tất cả truyện</option>
                              <option value="" disabled>⚠️ Không thể tải danh sách - ${error.message}</option>`;
  }
}

// Khởi tạo sự kiện cho modal xem chi tiết
function initChapterDetailModal() {
  // Nút phê duyệt trong modal
  const approveButton = document.getElementById("modal-approve-chapter");
  if (approveButton) {
    approveButton.addEventListener("click", function () {
      const chapterId = this.dataset.id;
      if (chapterId) {
        approveChapter(chapterId);
      }
    });
  }

  // Nút từ chối trong modal
  const rejectButton = document.getElementById("modal-reject-chapter");
  if (rejectButton) {
    rejectButton.addEventListener("click", function () {
      const chapterId = this.dataset.id;
      if (chapterId) {
        // Hiển thị form lý do từ chối
        showRejectReasonForm(chapterId);
      }
    });
  }

  // Form từ chối
  const rejectForm = document.getElementById("reject-reason-form");
  if (rejectForm) {
    rejectForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const chapterId = document.getElementById("reject-chapter-id").value;
      const reason = document.getElementById("reject-reason").value;
      rejectChapter(chapterId, reason);
    });
  }
}

// Hiển thị form lý do từ chối
function showRejectReasonForm(chapterId) {
  document.getElementById("reject-chapter-id").value = chapterId;
  document.getElementById("reject-reason").value = "";

  // Ẩn modal chi tiết
  $("#chapterDetailModal").modal("hide");

  // Hiển thị modal lý do
  $("#rejectReasonModal").modal("show");
}

// Tải danh sách chương
async function loadChapters() {
  const tableBody = document.getElementById("chapters-table-body");
  if (!tableBody) return;

  try {
    // Hiển thị loading
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center">
          <div class="spinner-border text-primary" role="status">
            <span class="sr-only">Đang tải...</span>
          </div>
        </td>
      </tr>
    `;

    // Xây dựng URL với các tham số lọc
    let apiUrl = `/api/chapters/admin/list?page=${currentPage}&limit=${pageSize}`;

    if (filterStatus && filterStatus !== "all") {
      apiUrl += `&status=${filterStatus}`;
    }

    if (filterStory) {
      apiUrl += `&story=${filterStory}`;
    }

    if (searchKeyword) {
      apiUrl += `&search=${encodeURIComponent(searchKeyword)}`;
    }

    console.log("Loading chapters with URL:", apiUrl);

    // Gọi API để lấy danh sách chương
    const response = await fetch(apiUrl, {
      headers: {
        // Bỏ tạm thời để phát triển
        // "Authorization": `Bearer ${localStorage.getItem("auth_token")}`,
        "Content-Type": "application/json",
      },
    });

    // Try to get response text for debugging even in case of error
    const responseText = await response.text();
    console.log("API response text:", responseText);

    // Parse response as JSON if possible
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("Error parsing JSON response:", e);
      throw new Error(
        `HTTP error! status: ${response.status}, can't parse response`
      );
    }

    if (!response.ok) {
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${
          data?.msg || "Unknown error"
        }`
      );
    }

    const chapters = data.chapters || [];
    totalPages = data.pagination?.totalPages || 1;

    console.log(
      `Loaded ${chapters.length} chapters, total pages: ${totalPages}`
    );

    // Render chương
    renderChapters(chapters, tableBody);

    // Render phân trang
    renderPagination();
  } catch (error) {
    console.error("Lỗi khi tải danh sách chương:", error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-danger">
          <i class="fas fa-exclamation-circle"></i> Đã xảy ra lỗi khi tải dữ liệu chương: ${error.message}
        </td>
      </tr>
    `;
  }
}

// Render chapters to table
function renderChapters(chapters, tableBody) {
  if (!Array.isArray(chapters)) {
    console.error("chapters is not an array:", chapters);
    return;
  }

  let html = "";
  chapters.forEach((chapter) => {
    const statusClass = getChapterStatusClass(chapter.status);
    const statusText = getChapterStatusText(chapter.status);

    html += `
      <tr>
        <td>${escapeHtml(chapter._id)}</td>
        <td>${escapeHtml(chapter.story?.title || "N/A")}</td>
        <td>${escapeHtml(chapter.title)}</td>
        <td>${chapter.number || "N/A"}</td>
        <td>${chapter.isFree ? "Miễn phí" : "Trả phí"}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td>${formatDate(chapter.createdAt)}</td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-sm btn-info view-chapter" data-id="${
              chapter._id
            }" title="Xem chi tiết">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn btn-sm btn-primary edit-chapter" data-id="${
              chapter._id
            }" title="Sửa chương">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-danger delete-chapter" data-id="${
              chapter._id
            }" title="Xóa chương">
              <i class="fas fa-trash-alt"></i>
            </button>
            ${
              chapter.status === "pending"
                ? `
              <button class="btn btn-sm btn-success approve-chapter" data-id="${chapter._id}" title="Duyệt">
                <i class="fas fa-check"></i>
              </button>
              <button class="btn btn-sm btn-danger reject-chapter" data-id="${chapter._id}" title="Từ chối">
                <i class="fas fa-times"></i>
              </button>
            `
                : ""
            }
          </div>
        </td>
      </tr>
    `;
  });

  tableBody.innerHTML = html;
  attachChapterButtonEvents();
}

// Attach events to chapter action buttons
function attachChapterButtonEvents() {
  // View button events
  document.querySelectorAll(".view-chapter").forEach((button) => {
    button.addEventListener("click", () => {
      const chapterId = button.dataset.id;
      viewChapterDetail(chapterId);
    });
  });

  // Edit button events
  document.querySelectorAll(".edit-chapter").forEach((button) => {
    button.addEventListener("click", function () {
      const chapterId = this.dataset.id;
      // Lưu ID chương cần sửa vào localStorage
      localStorage.setItem("editingChapterId", chapterId);
      // Chuyển hướng đến trang thêm chương
      window.location.href = "add-chapter.html";
    });
  });

  // Nút phê duyệt
  document.querySelectorAll(".approve-chapter").forEach((button) => {
    button.addEventListener("click", function () {
      const chapterId = this.dataset.id;
      approveChapter(chapterId);
    });
  });

  // Nút từ chối
  document.querySelectorAll(".reject-chapter").forEach((button) => {
    button.addEventListener("click", function () {
      const chapterId = this.dataset.id;
      showRejectReasonForm(chapterId);
    });
  });

  // Nút xóa chương
  document.querySelectorAll(".delete-chapter").forEach((button) => {
    button.addEventListener("click", async function () {
      const chapterId = this.dataset.id;
      if (
        !confirm(
          "Bạn có chắc chắn muốn xóa chương này? Hành động này không thể hoàn tác!"
        )
      )
        return;
      try {
        const token = localStorage.getItem("auth_token");
        const res = await fetch(`/api/chapters/${chapterId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const data = await res.json();
        if (data.success) {
          showToast("Thành công", "Đã xóa chương thành công!", "success");
          loadChapters();
        } else {
          showToast("Lỗi", data.message || "Không thể xóa chương", "danger");
        }
      } catch (err) {
        showToast("Lỗi", err.message || "Không thể xóa chương", "danger");
      }
    });
  });
}

// Render phân trang
function renderPagination() {
  const paginationContainer = document.getElementById("chapters-pagination");
  if (!paginationContainer) return;

  paginationContainer.innerHTML = createPagination(
    currentPage,
    totalPages,
    (page) => {
      currentPage = page;
      loadChapters();
    }
  );
}

// View chapter detail
async function viewChapterDetail(chapterId) {
  try {
    const token = localStorage.getItem("auth_token");
    const response = await fetch(`/api/chapters/${chapterId}/admin`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    const responseText = await response.text();
    if (responseText.trim().startsWith("<!DOCTYPE html>")) {
      throw new Error(
        "Server trả về HTML thay vì JSON. Vui lòng kiểm tra lại endpoint API."
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error(
        "Không thể xử lý dữ liệu từ server. Vui lòng thử lại sau."
      );
    }

    if (!data.success) {
      throw new Error(data.message || "Không thể tải thông tin chương");
    }

    const chapter = data.chapter;

    // Create and show modal with improved styling
    const modalHtml = `
      <div class="modal fade" id="chapterDetailModal" tabindex="-1">
        <div class="modal-dialog modal-fullscreen-xl-down" style="max-width: 98%; margin: 0.5rem auto;">
          <div class="modal-content">
            <div class="modal-header bg-primary text-white py-3">
              <h5 class="modal-title fs-4">Chi tiết chương</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4">
              <div class="chapter-info mb-4">
                <div class="row g-4">
                  <div class="col-12">
                    <div class="d-flex gap-4">
                      <div class="flex-grow-1">
                        <label class="fw-bold text-primary mb-2 fs-5">ID:</label>
                        <div class="border rounded p-3 bg-light text-break" style="word-wrap: break-word;">
                          ${escapeHtml(chapter._id)}
                        </div>
                      </div>
                      <div class="flex-grow-1">
                        <label class="fw-bold text-primary mb-2 fs-5">Tiêu đề:</label>
                        <div class="border rounded p-3 bg-light">
                          ${escapeHtml(chapter.title)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="col-12">
                    <div class="d-flex gap-4">
                      <div class="flex-grow-1">
                        <label class="fw-bold text-primary mb-2 fs-5">Truyện:</label>
                        <div class="border rounded p-3 bg-light">
                          ${escapeHtml(chapter.story?.title || "N/A")}
                        </div>
                      </div>
                      <div class="flex-grow-1">
                        <label class="fw-bold text-primary mb-2 fs-5">Số chương:</label>
                        <div class="border rounded p-3 bg-light">
                          ${chapter.number || "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="col-12">
                    <div class="d-flex gap-4">
                      <div class="flex-grow-1">
                        <label class="fw-bold text-primary mb-2 fs-5">Loại:</label>
                        <div class="border rounded p-3 bg-light">
                          ${chapter.isFree ? "Miễn phí" : "Trả phí"}
                        </div>
                      </div>
                      <div class="flex-grow-1">
                        <label class="fw-bold text-primary mb-2 fs-5">Trạng thái:</label>
                        <div class="border rounded p-3 bg-light">
                          ${getChapterStatusText(chapter.status)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="chapter-content-section">
                <h6 class="fw-bold text-primary mb-3 fs-4">Nội dung chương:</h6>
                <div class="content-preview border rounded p-4" 
                     style="max-height: 70vh; overflow-y: auto; background-color: #f8f9fa;">
                  ${formatChapterContent(chapter.content)}
                </div>
              </div>
            </div>
            <div class="modal-footer py-3">
              <button type="button" class="btn btn-secondary px-4 py-2" data-bs-dismiss="modal">Đóng</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById("chapterDetailModal");
    if (existingModal) {
      existingModal.remove();
    }

    // Add new modal to body
    document.body.insertAdjacentHTML("beforeend", modalHtml);

    // Show modal
    const modal = new bootstrap.Modal(
      document.getElementById("chapterDetailModal")
    );
    modal.show();
  } catch (error) {
    console.error("Error viewing chapter detail:", error);
    showToast("Lỗi", error.message, "error");
  }
}

// Phê duyệt chương
async function approveChapter(chapterId) {
  try {
    const response = await fetch(`/api/chapters/admin/approve/${chapterId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.msg || `HTTP error! status: ${response.status}`
      );
    }

    // Đóng modal
    $("#chapterDetailModal").modal("hide");

    // Hiển thị thông báo thành công
    showToast(
      "Phê duyệt thành công",
      "Chương đã được phê duyệt và xuất bản.",
      "success"
    );

    // Tải lại danh sách chương
    loadChapters();
  } catch (error) {
    console.error("Lỗi khi phê duyệt chương:", error);
    showToast(
      "Lỗi phê duyệt",
      `Không thể phê duyệt chương: ${error.message}`,
      "error"
    );
  }
}

// Từ chối chương
async function rejectChapter(chapterId, reason) {
  try {
    const response = await fetch(`/api/chapters/admin/reject/${chapterId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.msg || `HTTP error! status: ${response.status}`
      );
    }

    // Đóng modal từ chối
    $("#rejectReasonModal").modal("hide");

    // Hiển thị thông báo thành công
    showToast(
      "Từ chối thành công",
      "Chương đã bị từ chối với lý do đã nêu.",
      "success"
    );

    // Tải lại danh sách chương
    loadChapters();
  } catch (error) {
    console.error("Lỗi khi từ chối chương:", error);
    showToast(
      "Lỗi từ chối",
      `Không thể từ chối chương: ${error.message}`,
      "error"
    );
  }
}

// Hiển thị thông báo toast
function showToast(title, message, type = "info") {
  // Tạo element toast nếu chưa có
  if (!document.getElementById("toast-container")) {
    const toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    toastContainer.className =
      "toast-container position-fixed bottom-0 end-0 p-3";
    document.body.appendChild(toastContainer);
  }

  // Tạo ID duy nhất cho toast
  const toastId = `toast-${Date.now()}`;

  // Xác định class cho loại toast
  let typeClass = "bg-info text-white";
  if (type === "success") typeClass = "bg-success text-white";
  if (type === "error") typeClass = "bg-danger text-white";
  if (type === "warning") typeClass = "bg-warning text-dark";

  // Tạo HTML cho toast
  const toastHtml = `
    <div id="${toastId}" class="toast ${typeClass}" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="toast-header">
        <strong class="me-auto">${title}</strong>
        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body">
        ${message}
      </div>
    </div>
  `;

  // Thêm toast vào container
  document
    .getElementById("toast-container")
    .insertAdjacentHTML("beforeend", toastHtml);

  // Khởi tạo và hiển thị toast
  const toastElement = document.getElementById(toastId);
  const toast = new bootstrap.Toast(toastElement, {
    autohide: true,
    delay: 5000,
  });
  toast.show();

  // Xóa toast sau khi ẩn
  toastElement.addEventListener("hidden.bs.toast", function () {
    toastElement.remove();
  });
}

// Format nội dung chương
function formatChapterContent(content) {
  if (!content) return "";

  // Đảm bảo nội dung an toàn
  const safeContent = escapeHtml(content);

  // Tách các đoạn bằng dấu xuống dòng
  const paragraphs = safeContent.split("\n").filter((para) => para.trim());

  // Tạo HTML với style để đảm bảo định dạng đẹp
  return `<div class="chapter-content" style="font-family: 'Roboto', sans-serif;">
    ${paragraphs
      .map(
        (para) => `
      <p style="margin-bottom: 1.5rem; line-height: 2; font-size: 1.1rem; text-align: justify; padding: 0 2rem;">
        ${para}
      </p>
    `
      )
      .join("")}
  </div>`;
}

// Lấy class CSS cho trạng thái chương
function getChapterStatusClass(status) {
  switch (status) {
    case "approved":
    case "published": // Also handle "published" status from server
      return "badge-success";
    case "pending":
      return "badge-warning";
    case "rejected":
      return "badge-danger";
    case "draft":
      return "badge-secondary";
    default:
      return "badge-secondary";
  }
}

// Lấy text cho trạng thái chương
function getChapterStatusText(status) {
  switch (status) {
    case "approved":
    case "published": // Also handle "published" status from server
      return "Đã duyệt";
    case "pending":
      return "Chờ duyệt";
    case "rejected":
      return "Đã từ chối";
    case "draft":
      return "Bản nháp";
    default:
      return "Không xác định";
  }
}

// Debounce function
function debounce(func, wait) {
  let timeout;
  return function () {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}

// Giả lập dữ liệu chương
function generateMockChapters() {
  return [
    {
      _id: "chap1",
      story: {
        _id: "story1",
        title: "Đấu La Đại Lục",
      },
      title: "Chương 243: Tu luyện",
      number: 243,
      isFree: false,
      status: "pending",
      author: {
        _id: "user2",
        username: "reader123",
      },
      content:
        "Đường Tam đứng trên đỉnh núi cao, nhìn xuống vực thẳm phía dưới. Gió lớn thổi qua, làm bay tóc anh, thân thể anh dưới cơn gió mạnh chút nào cũng không lay động.\n\nĐường Tam nhẹ thở ra một hơi, phân biệt rõ bốn phương và chậm rãi ngồi xuống vào tư thế thiền.\n\nAnh cảm nhận được sức mạnh đại tự nhiên trước mắt, từng tấc không khí trong trẻo như thủy tinh được anh thu vào trong cơ thể.\n\nLuyện công khi đứng một mình trên đỉnh núi là một cách tuyệt vời để tăng khả năng tập trung. Đường Tam đã đạt đến một cảnh giới mới trong tu luyện.",
      createdAt: "2023-04-05T11:30:00Z",
    },
    {
      _id: "chap2",
      story: {
        _id: "story2",
        title: "Vũ Động Càn Khôn",
      },
      title: "Chương 156: Đột phá",
      number: 156,
      isFree: true,
      status: "approved",
      author: {
        _id: "user3",
        username: "bookworm",
      },
      content:
        "Lâm Động ngẩng đầu nhìn lên bầu trời đầy sao, cảm giác được vô số năng lượng thiên địa đang vọt vào cơ thể mình.\n\nAnh biết mình sắp đột phá, đây là cơ hội ngàn năm có một.\n\nKhu rừng xung quanh yên tĩnh đến kỳ lạ, như thể ngay cả tự nhiên cũng đang nín thở chờ đợi khoảnh khắc này.\n\nVà rồi, như thể có một tiếng nổ vô hình trong cơ thể, Lâm Động cảm nhận được một dòng năng lượng vô tận tuôn trào ra từ khắp các lỗ chân lông.",
      createdAt: "2023-04-05T10:45:00Z",
    },
    {
      _id: "chap3",
      story: {
        _id: "story3",
        title: "Tu Chân Liệt Truyện",
      },
      title: "Chương 78: Luyện công",
      number: 78,
      isFree: false,
      status: "pending",
      author: {
        _id: "user5",
        username: "storymaster",
      },
      content:
        "Vương Lâm ngồi trong động phủ, trước mặt là một chiếc bàn đá, trên bàn đặt ba viên đan dược màu đỏ tươi như máu.\n\nAnh ta không vội vàng nuốt xuống mà ngắm nhìn những viên đan được làm tinh xảo đó, mỗi một viên đan đều là kết quả của hàng trăm loại dược liệu và quá trình luyện đan cực kỳ phức tạp.\n\nSau một hồi suy nghĩ, Vương Lâm quyết định bắt đầu. Anh cầm lấy viên đan thứ nhất, nuốt vào bụng.\n\nNgay lập tức, một luồng nhiệt nóng như lửa đốt lan tỏa khắp cơ thể anh ta...",
      createdAt: "2023-04-05T09:20:00Z",
    },
    {
      _id: "chap4",
      story: {
        _id: "story4",
        title: "Phàm Nhân Tu Tiên",
      },
      title: "Chương 102: Thanh kiếm",
      number: 102,
      isFree: false,
      status: "rejected",
      rejectReason:
        "Nội dung chương có quá nhiều lỗi chính tả, cần chỉnh sửa lại.",
      author: {
        _id: "user2",
        username: "reader123",
      },
      content:
        "Hàn Lập cầm thanh kiếm trong tay, bất ngờ vì trọng lượng của nó. Thanh kiếm nhẹ như không, nhưng anh có thể cảm nhận được sức mạnh ẩn chứa bên trong.\n\nKhi anh rút kiếm ra khỏi vỏ, ánh sáng lạnh lẽo phản chiếu từ lưỡi kiếm, chiếu sáng cả căn phòng tối.\n\nĐây không phải là một thanh kiếm tầm thường, mà là một bảo vật đã tồn tại hàng ngàn năm, ẩn chứa linh khí dày đặc.\n\nHàn Lập nhẹ nhàng vung kiếm, một đường kiếm khí bắn ra, cắt đứt một cọng cỏ cách đó mấy thước...",
      createdAt: "2023-04-04T14:25:00Z",
    },
    {
      _id: "chap5",
      story: {
        _id: "story5",
        title: "Tru Tiên",
      },
      title: "Chương 55: Thanh Vân Môn",
      number: 55,
      isFree: true,
      status: "approved",
      author: {
        _id: "user5",
        username: "storymaster",
      },
      content:
        "Trương Tiểu Phàm đứng trước cổng Thanh Vân Môn, ngước nhìn tấm biển lớn khắc ba chữ Thanh Vân Môn bằng vàng.\n\nAnh đã nghe về môn phái này từ lâu, nơi đây là một trong những môn phái lớn nhất thiên hạ, nơi đào tạo ra vô số cao thủ tuyệt thế.\n\nGiờ đây, anh sắp trở thành một phần của lịch sử huy hoàng đó.\n\nTrương Tiểu Phàm hít một hơi thật sâu, bước qua cổng lớn. Ngay khi bước vào, anh có thể cảm nhận được không khí linh khí đậm đặc và thanh tịnh, hoàn toàn khác với thế giới bên ngoài.",
      createdAt: "2023-04-04T11:15:00Z",
    },
  ];
}

// Khởi tạo nút thêm chương
function initAddChapterButton() {
  const addChapterBtn = document.getElementById("add-chapter-btn");
  if (addChapterBtn) {
    addChapterBtn.addEventListener("click", function () {
      // Xóa thông tin chương đang sửa khỏi localStorage
      localStorage.removeItem("editingChapterId");
      localStorage.removeItem("editingStoryId");
      window.location.href = "add-chapter.html";
    });
  }
}
