// Admin Transactions Management

// Global variables
let currentPage = 1;
let totalPages = 1;
let pageSize = 10;
let filterType = "all";
let filterStatus = "all";
let startDate = "";
let endDate = "";
let searchKeyword = "";
let currentFilters = {
  type: "all",
  status: "all",
  search: "",
  dateFrom: "",
  dateTo: "",
};

// DOM Elements
const typeFilter = document.getElementById("type-filter");
const statusFilter = document.getElementById("status-filter");
const dateFromFilter = document.getElementById("date-from");
const dateToFilter = document.getElementById("date-to");
const searchInput = document.getElementById("search-transaction");
const searchButton = document.getElementById("search-button");
const resetButton = document.getElementById("reset-button");
const exportButton = document.getElementById("export-csv");
const transactionsList = document.getElementById("transactions-list");
const loadingIndicator = document.getElementById("loading-indicator");
const emptyState = document.getElementById("empty-state");
const paginationContainer = document.getElementById("pagination-container");
const pagination = document.getElementById("pagination");

// Transaction Detail Modal
const transactionModal = new bootstrap.Modal(
  document.getElementById("transactionModal")
);
const modalTransactionId = document.getElementById("modal-transaction-id");
const modalUser = document.getElementById("modal-user");
const modalType = document.getElementById("modal-type");
const modalCoins = document.getElementById("modal-coins");
const modalStatus = document.getElementById("modal-status");
const modalCreatedAt = document.getElementById("modal-created-at");
const modalUpdatedAt = document.getElementById("modal-updated-at");
const modalDetails = document.getElementById("modal-details");
const actionSection = document.getElementById("action-section");
const approveButton = document.getElementById("approve-transaction");
const cancelButton = document.getElementById("cancel-transaction");

// Modal xác nhận xóa cưỡng bức
let forceDeleteModal = null;
function showForceDeleteModal(message, onContinue) {
  // Đóng mọi modal đang mở
  document.querySelectorAll(".modal.show").forEach((modal) => {
    bootstrap.Modal.getInstance(modal)?.hide();
  });

  // Nếu modal đã tồn tại thì xóa hoàn toàn khỏi DOM
  let oldModal = document.getElementById("forceDeleteModal");
  if (oldModal) {
    oldModal.parentNode.removeChild(oldModal);
  }

  // Tạo modal động đúng chuẩn, KHÔNG set style, KHÔNG thêm class "show"
  const modalHtml = `
    <div class="modal fade" id="forceDeleteModal" tabindex="-1" role="dialog" aria-labelledby="forceDeleteModalLabel" aria-hidden="true">
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="forceDeleteModalLabel">Cảnh báo</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3 text-danger">${message}</div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">OK</button>
            <button type="button" class="btn btn-danger" id="forceDeleteBtn">Tiếp tục</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHtml);
  const modalEl = document.getElementById("forceDeleteModal");
  // Đảm bảo modal KHÔNG có style display hoặc class show khi vừa tạo
  modalEl.removeAttribute("style");
  modalEl.classList.remove("show");

  forceDeleteModal = new bootstrap.Modal(modalEl, {
    backdrop: "static",
    keyboard: true,
  });

  modalEl.addEventListener("shown.bs.modal", function () {
    document.getElementById("forceDeleteBtn").onclick = function () {
      forceDeleteModal.hide();
      if (onContinue) onContinue();
      setTimeout(() => modalEl.remove(), 500);
    };
    document.getElementById("forceDeleteBtn").focus();
  });
  modalEl.addEventListener("hidden.bs.modal", function () {
    setTimeout(() => modalEl.remove(), 500);
  });
  forceDeleteModal.show();
}

// Initialize page
document.addEventListener("DOMContentLoaded", function () {
  console.log("Initializing transactions page...");
  loadTransactions();
  setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
  // Filter changes
  if (typeFilter) typeFilter.addEventListener("change", applyFilters);
  if (statusFilter) statusFilter.addEventListener("change", applyFilters);
  if (dateFromFilter) dateFromFilter.addEventListener("change", applyFilters);
  if (dateToFilter) dateToFilter.addEventListener("change", applyFilters);

  // Search
  if (searchButton) searchButton.addEventListener("click", applyFilters);
  if (searchInput)
    searchInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        applyFilters();
      }
    });

  // Reset filters
  if (resetButton) resetButton.addEventListener("click", resetFilters);

  // Export to CSV
  if (exportButton) exportButton.addEventListener("click", exportTransactions);

  // Modal actions
  if (approveButton)
    approveButton.addEventListener("click", function () {
      const transactionId = modalTransactionId.textContent;
      approveTransaction(transactionId);
    });

  if (cancelButton)
    cancelButton.addEventListener("click", function () {
      const transactionId = modalTransactionId.textContent;
      cancelTransaction(transactionId);
    });
}

// Apply filters and reload transactions
function applyFilters() {
  currentPage = 1;
  currentFilters = {
    type: typeFilter.value,
    status: statusFilter.value,
    search: searchInput.value.trim(),
    dateFrom: dateFromFilter.value,
    dateTo: dateToFilter.value,
  };

  loadTransactions();
}

// Reset all filters
function resetFilters() {
  typeFilter.value = "all";
  statusFilter.value = "all";
  dateFromFilter.value = "";
  dateToFilter.value = "";
  searchInput.value = "";

  currentFilters = {
    type: "all",
    status: "all",
    search: "",
    dateFrom: "",
    dateTo: "",
  };

  loadTransactions();
}

// Load transactions with current filters and pagination
async function loadTransactions() {
  showLoading();

  try {
    // Build query string
    const queryParams = new URLSearchParams();
    queryParams.append("page", currentPage);
    queryParams.append("limit", 10);

    if (currentFilters.type !== "all") {
      queryParams.append("type", currentFilters.type);
    }

    if (currentFilters.status !== "all") {
      queryParams.append("status", currentFilters.status);
    }

    if (currentFilters.search) {
      queryParams.append("search", currentFilters.search);
    }

    if (currentFilters.dateFrom) {
      queryParams.append("dateFrom", currentFilters.dateFrom);
    }

    if (currentFilters.dateTo) {
      queryParams.append("dateTo", currentFilters.dateTo);
    }

    // Fetch transactions - FIX: Corrected API endpoint to match the route defined in the server
    const response = await fetch(
      `/api/transactions?${queryParams.toString()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          // 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` // Tạm thời bỏ xác thực để dễ test
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // For debugging, check the content type
    const contentType = response.headers.get("Content-Type");
    console.log("Response Content-Type:", contentType);

    // For debugging, log the raw response before parsing
    const text = await response.text();
    console.log("Raw response:", text);

    // Nếu không phải JSON, báo lỗi rõ ràng
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error(
        "Server trả về dữ liệu không phải JSON. Có thể bạn đã bị đăng xuất hoặc server lỗi."
      );
    }

    // Try to parse the response as JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse JSON:", e);
      throw new Error("Server không trả về dữ liệu JSON hợp lệ");
    }

    // Log data to console for debugging
    console.log("Received transactions data:", data);

    // Render transactions
    renderTransactions(data.transactions || [], data.pagination || {});
  } catch (error) {
    console.error("Error loading transactions:", error);

    // Show error message
    transactionsList.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-danger">
          <i class="bi bi-exclamation-triangle me-2"></i>
          Lỗi khi tải dữ liệu: ${error.message}
        </td>
      </tr>
    `;

    // Show empty state
    showEmptyState();
  } finally {
    hideLoading();
  }
}

// Render transactions data
function renderTransactions(transactions, paginationData) {
  if (!transactions || transactions.length === 0) {
    showEmptyState();
    return;
  }

  hideEmptyState();

  // Clear previous data
  transactionsList.innerHTML = "";

  // Add transactions to table
  transactions.forEach((transaction) => {
    // Format date
    const createdAt = new Date(transaction.createdAt).toLocaleString("vi-VN");

    // Determine status class
    let statusClass = "secondary";
    if (transaction.status === "completed") statusClass = "success";
    if (transaction.status === "pending") statusClass = "warning";
    if (transaction.status === "cancelled") statusClass = "danger";
    if (transaction.status === "failed") statusClass = "danger";

    // Determine transaction content
    let content = "";
    if (transaction.type === "purchase") {
      content = `Nạp ${transaction.coins} xu`;
    } else if (transaction.type === "usage") {
      content = transaction.use?.info || `Sử dụng ${transaction.coins} xu`;
    } else if (transaction.type === "reward") {
      content = `Thưởng ${transaction.coins} xu`;
    }

    // Add row
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${transaction.user?.userId || ""}</td>
      <td>${transaction.user?.username || transaction.user}</td>
      <td>${formatTransactionType(transaction.type)}</td>
      <td class="${
        transaction.type === "usage" ? "text-danger" : "text-success"
      }">
        ${transaction.type === "usage" ? "-" : "+"} ${transaction.coins}
      </td>
      <td><span class="badge bg-${statusClass}">${formatStatus(
      transaction.status
    )}</span></td>
      <td>${createdAt}</td>
      <td>
        <button class="btn btn-sm btn-danger delete-transaction" data-id="${
          transaction._id
        }" title="Xóa giao dịch">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;

    // Add click event to delete button
    row
      .querySelector(".delete-transaction")
      .addEventListener("click", async () => {
        if (confirm("Bạn có chắc chắn muốn xóa giao dịch này?")) {
          try {
            let resp = await fetch(`/api/transactions/${transaction._id}`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
            });
            let data = await resp.json();
            if (data.success) {
              alert("Đã xóa giao dịch thành công!");
              loadTransactions();
            } else if (
              data.message &&
              data.message.includes("Không thể xóa giao dịch nạp xu này") &&
              data.canForce
            ) {
              // Hiện modal xác nhận cưỡng bức
              showForceDeleteModal(data.message, async () => {
                // Gửi lại request với force=true
                let resp2 = await fetch(
                  `/api/transactions/${transaction._id}?force=true`,
                  {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                  }
                );
                let data2 = await resp2.json();
                if (data2.success) {
                  alert("Đã xóa giao dịch thành công!");
                  loadTransactions();
                } else {
                  alert(data2.message || "Lỗi khi xóa giao dịch!");
                }
              });
            } else {
              alert(data.message || "Lỗi khi xóa giao dịch!");
            }
          } catch (e) {
            alert("Lỗi khi xóa giao dịch!");
          }
        }
      });

    transactionsList.appendChild(row);
  });

  // Render pagination
  renderPagination(paginationData);
}

// Render pagination controls
function renderPagination(paginationData) {
  if (!paginationData || paginationData.totalPages <= 1) {
    paginationContainer.classList.add("d-none");
    return;
  }

  paginationContainer.classList.remove("d-none");
  pagination.innerHTML = "";

  // Previous button
  const prevLi = document.createElement("li");
  prevLi.className = `page-item ${currentPage === 1 ? "disabled" : ""}`;
  prevLi.innerHTML = `<a class="page-link" href="#">&laquo;</a>`;
  prevLi.addEventListener("click", (e) => {
    e.preventDefault();
    if (currentPage > 1) {
      currentPage--;
      loadTransactions();
    }
  });
  pagination.appendChild(prevLi);

  // Page numbers
  for (let i = 1; i <= paginationData.totalPages; i++) {
    // Only show a limited number of pages
    if (
      i === 1 ||
      i === paginationData.totalPages ||
      (i >= currentPage - 2 && i <= currentPage + 2)
    ) {
      const li = document.createElement("li");
      li.className = `page-item ${i === currentPage ? "active" : ""}`;
      li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
      li.addEventListener("click", (e) => {
        e.preventDefault();
        currentPage = i;
        loadTransactions();
      });
      pagination.appendChild(li);
    } else if (
      (i === currentPage - 3 && i > 1) ||
      (i === currentPage + 3 && i < paginationData.totalPages)
    ) {
      // Add ellipsis
      const li = document.createElement("li");
      li.className = "page-item disabled";
      li.innerHTML = '<a class="page-link" href="#">...</a>';
      pagination.appendChild(li);
    }
  }

  // Next button
  const nextLi = document.createElement("li");
  nextLi.className = `page-item ${
    currentPage === paginationData.totalPages ? "disabled" : ""
  }`;
  nextLi.innerHTML = `<a class="page-link" href="#">&raquo;</a>`;
  nextLi.addEventListener("click", (e) => {
    e.preventDefault();
    if (currentPage < paginationData.totalPages) {
      currentPage++;
      loadTransactions();
    }
  });
  pagination.appendChild(nextLi);
}

// View transaction detail
async function viewTransactionDetail(transactionId) {
  try {
    // Show loading in modal
    modalDetails.innerHTML =
      '<div class="text-center"><div class="spinner-border spinner-border-sm" role="status"></div></div>';

    // Open modal
    transactionModal.show();

    // Fetch transaction data - Updated endpoint to match server routes
    const response = await fetch(`/api/transactions/${transactionId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` // Tạm thời bỏ xác thực để dễ test
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // For debugging, check content type
    console.log(
      "Detail Response Content-Type:",
      response.headers.get("Content-Type")
    );

    // For debugging, log the raw response
    const text = await response.text();
    console.log("Raw detail response:", text);

    // Try to parse JSON
    let transaction;
    try {
      transaction = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse transaction JSON:", e);
      throw new Error("Không thể phân tích dữ liệu giao dịch");
    }

    console.log("Received transaction detail:", transaction);

    // Populate modal
    populateTransactionModal(transaction);
  } catch (error) {
    console.error("Error loading transaction detail:", error);
    modalDetails.innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle me-2"></i>
        Lỗi khi tải chi tiết giao dịch: ${error.message}
      </div>
    `;
  }
}

// Populate transaction modal with data
function populateTransactionModal(transaction) {
  // Set basic info
  modalTransactionId.textContent = transaction._id;
  modalUser.textContent = transaction.user?.username || transaction.user;
  modalType.textContent = formatTransactionType(transaction.type);
  modalCoins.textContent = transaction.coins;

  // Format and set status
  let statusClass = "secondary";
  if (transaction.status === "completed") statusClass = "success";
  if (transaction.status === "pending") statusClass = "warning";
  if (transaction.status === "cancelled") statusClass = "danger";
  if (transaction.status === "failed") statusClass = "danger";

  modalStatus.innerHTML = `<span class="badge bg-${statusClass}">${formatStatus(
    transaction.status
  )}</span>`;

  // Set dates
  modalCreatedAt.textContent = new Date(transaction.createdAt).toLocaleString(
    "vi-VN"
  );
  modalUpdatedAt.textContent = new Date(transaction.updatedAt).toLocaleString(
    "vi-VN"
  );

  // Set transaction details based on type
  let detailsHtml = "";

  if (transaction.type === "purchase") {
    detailsHtml = `
      <div class="mb-3">
        <h6>Thông tin thanh toán</h6>
        <p><strong>Phương thức:</strong> ${
          transaction.payment?.method || "N/A"
        }</p>
        <p><strong>Mã giao dịch:</strong> ${
          transaction.payment?.transactionId || "N/A"
        }</p>
        <p><strong>Số tiền:</strong> ${
          transaction.payment?.amount
            ? formatCurrency(transaction.payment.amount)
            : "N/A"
        }</p>
      </div>
    `;
  } else if (transaction.type === "usage") {
    detailsHtml = `
      <div class="mb-3">
        <h6>Thông tin sử dụng</h6>
        <p><strong>Đối tượng:</strong> ${formatTargetType(
          transaction.use?.target
        )}</p>
        <p><strong>ID đối tượng:</strong> ${
          transaction.use?.targetId || "N/A"
        }</p>
        <p><strong>Nội dung:</strong> ${transaction.use?.info || "N/A"}</p>
      </div>
    `;
  } else if (transaction.type === "reward") {
    detailsHtml = `
      <div class="mb-3">
        <h6>Thông tin thưởng</h6>
        <p><strong>Lý do:</strong> ${transaction.reward?.reason || "N/A"}</p>
        <p><strong>Ghi chú:</strong> ${transaction.reward?.note || "N/A"}</p>
      </div>
    `;
  }

  modalDetails.innerHTML = detailsHtml;

  // Show/hide action buttons based on status
  if (transaction.status === "pending") {
    actionSection.classList.remove("d-none");
  } else {
    actionSection.classList.add("d-none");
  }
}

// Approve a pending transaction
async function approveTransaction(transactionId) {
  if (!confirm("Bạn có chắc chắn muốn phê duyệt giao dịch này?")) return;

  try {
    const response = await fetch(`/api/transactions/approve/${transactionId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        // 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` // Tạm thời bỏ xác thực để dễ test
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("Transaction approved:", result);

    alert("Giao dịch đã được phê duyệt thành công");
    transactionModal.hide();
    loadTransactions();
  } catch (error) {
    console.error("Error approving transaction:", error);
    alert(`Lỗi: ${error.message}`);
  }
}

// Cancel a pending transaction
async function cancelTransaction(transactionId) {
  const reason = prompt("Vui lòng nhập lý do hủy giao dịch:");
  if (!reason) return;

  try {
    const response = await fetch(`/api/transactions/cancel/${transactionId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        // 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` // Tạm thời bỏ xác thực để dễ test
      },
      body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("Transaction cancelled:", result);

    alert("Giao dịch đã được hủy thành công");
    transactionModal.hide();
    loadTransactions();
  } catch (error) {
    console.error("Error cancelling transaction:", error);
    alert(`Lỗi: ${error.message}`);
  }
}

// Export transactions to CSV
function exportTransactions() {
  // Get current filters
  const filters = currentFilters;

  // Create query string for export
  const queryParams = new URLSearchParams();

  if (filters.type !== "all") {
    queryParams.append("type", filters.type);
  }

  if (filters.status !== "all") {
    queryParams.append("status", filters.status);
  }

  if (filters.search) {
    queryParams.append("search", filters.search);
  }

  if (filters.dateFrom) {
    queryParams.append("dateFrom", filters.dateFrom);
  }

  if (filters.dateTo) {
    queryParams.append("dateTo", filters.dateTo);
  }

  // Create download URL with current filters
  const downloadUrl = `/api/transactions/export?${queryParams.toString()}`;

  // Create temporary link and trigger download
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.setAttribute(
    "download",
    `transactions-export-${new Date().toISOString().split("T")[0]}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Helper functions
function formatTransactionType(type) {
  switch (type) {
    case "deposit":
      return "Nạp xu";
    case "usage":
      return "Mua chương";
    case "reward":
      return "Thưởng";
    default:
      return type;
  }
}

function formatStatus(status) {
  switch (status) {
    case "pending":
      return "Chờ xử lý";
    case "completed":
      return "Hoàn thành";
    case "cancelled":
      return "Đã hủy";
    case "failed":
      return "Thất bại";
    default:
      return status;
  }
}

function formatTargetType(target) {
  switch (target) {
    case "chapter":
      return "Chương truyện";
    case "story":
      return "Truyện";
    case "donation":
      return "Ủng hộ";
    default:
      return target;
  }
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

function showLoading() {
  loadingIndicator.classList.remove("d-none");
  emptyState.classList.add("d-none");
}

function hideLoading() {
  loadingIndicator.classList.add("d-none");
}

function showEmptyState() {
  transactionsList.innerHTML = "";
  emptyState.classList.remove("d-none");
  paginationContainer.classList.add("d-none");
}

function hideEmptyState() {
  emptyState.classList.add("d-none");
}
