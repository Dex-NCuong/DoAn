// Admin Dashboard

// DOM ready
document.addEventListener("DOMContentLoaded", function () {
  // Kiểm tra quyền admin
  if (!checkAdminAuth()) return;

  // Tải dữ liệu tổng quan
  loadDashboardStats();

  // Tải giao dịch gần đây
  loadRecentTransactions();

  // Tải chương đang chờ duyệt
  loadPendingChapters();

  // Khởi tạo biểu đồ
  initCharts();
});

// Tải thống kê tổng quan
async function loadDashboardStats() {
  try {
    // Gọi API để lấy thống kê dashboard
    const response = await authorizedFetch(`/api/admin/dashboard/stats`);
    if (!response) return;

    const result = await response.json();

    if (result.success) {
      const { userCount, storyCount, chapterCount, pendingChapters } =
        result.data;

      const userCountEl = document.getElementById("user-count");
      if (userCountEl) userCountEl.textContent = userCount.toLocaleString();
      const storyCountEl = document.getElementById("story-count");
      if (storyCountEl) storyCountEl.textContent = storyCount.toLocaleString();
      const chapterCountEl = document.getElementById("chapter-count");
      if (chapterCountEl)
        chapterCountEl.textContent = chapterCount.toLocaleString();
      const pendingCountEl = document.getElementById("pending-count");
      if (pendingCountEl)
        pendingCountEl.textContent = pendingChapters.toLocaleString();
    } else {
      console.error("Lỗi khi tải thống kê tổng quan:", result.message);
      showMessage("Không thể tải thống kê tổng quan", "error");
    }
  } catch (error) {
    console.error("Lỗi khi tải thống kê tổng quan:", error);
    showMessage("Đã xảy ra lỗi khi tải thống kê", "error");
  }
}

// Tải giao dịch gần đây
async function loadRecentTransactions() {
  const tableBody = document.getElementById("recent-transactions");
  if (!tableBody) return;

  try {
    // Gọi API để lấy giao dịch gần đây
    const response = await authorizedFetch(`/api/admin/transactions/recent`);
    if (!response) return;

    const result = await response.json();

    if (!result.success || !result.data || !Array.isArray(result.data)) {
      throw new Error("Dữ liệu không hợp lệ");
    }

    const transactions = result.data;

    // Render transactions
    if (transactions.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center">Không có giao dịch nào gần đây</td>
        </tr>
      `;
      return;
    }

    let html = "";

    transactions.forEach((tx) => {
      // Chỉ hiển thị nếu là deposit, purchase hoặc usage
      if (
        tx.type !== "deposit" &&
        tx.type !== "purchase" &&
        tx.type !== "usage"
      ) {
        return; // Bỏ qua các loại khác
      }
      let typeClass = "badge-info";
      let typeText = "";
      if (tx.type === "deposit") {
        typeClass = "badge-success";
        typeText = "Nạp xu";
      } else if (tx.type === "purchase" || tx.type === "usage") {
        typeClass = "badge-primary";
        typeText = "Mua chương";
      }

      const statusClass = getStatusClass(tx.status);
      const statusText = getStatusText(tx.status);

      html += `
        <tr>
          <td>${tx.user && tx.user.userId ? tx.user.userId : "N/A"}</td>
          <td>${escapeHtml(tx.user ? tx.user.username : "N/A")}</td>
          <td><span class="badge ${typeClass}">${typeText}</span></td>
          <td>${tx.coins}</td>
          <td><span class="badge ${statusClass}">${statusText}</span></td>
          <td>${formatDate(tx.createdAt)}</td>
        </tr>
      `;
    });

    tableBody.innerHTML = html;
  } catch (error) {
    console.error("Lỗi khi tải giao dịch gần đây:", error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center">Không thể tải dữ liệu giao dịch</td>
      </tr>
    `;
  }
}

// Tải chương đang chờ duyệt
async function loadPendingChapters() {
  const tableBody = document.getElementById("pending-chapters");
  if (!tableBody) return;

  try {
    // Gọi API để lấy chương đang chờ duyệt
    const response = await authorizedFetch(`/api/admin/chapters/pending`);
    if (!response) return;

    const result = await response.json();

    if (!result.success || !result.data || !Array.isArray(result.data)) {
      throw new Error("Dữ liệu không hợp lệ");
    }

    const chapters = result.data;

    // Render chapters
    if (chapters.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center">Không có chương nào đang chờ duyệt</td>
        </tr>
      `;
      return;
    }

    let html = "";

    chapters.forEach((ch) => {
      const freeLabel = ch.isFree
        ? '<span class="badge badge-success">Miễn phí</span>'
        : '<span class="badge badge-primary">VIP</span>';

      html += `
        <tr>
          <td>${ch._id}</td>
          <td>${escapeHtml(ch.story ? ch.story.title : "N/A")}</td>
          <td>${escapeHtml(ch.title)}</td>
          <td>${freeLabel}</td>
          <td>${formatDate(ch.createdAt)}</td>
          <td>
            <div class="action-buttons">
              <button class="btn btn-sm btn-success approve-chapter" data-id="${
                ch._id
              }">
                <i class="fas fa-check"></i>
              </button>
              <button class="btn btn-sm btn-danger reject-chapter" data-id="${
                ch._id
              }">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    tableBody.innerHTML = html;

    // Thêm sự kiện cho các nút
    document.querySelectorAll(".approve-chapter").forEach((btn) => {
      btn.addEventListener("click", function () {
        const chapterId = this.dataset.id;
        approveChapter(chapterId);
      });
    });

    document.querySelectorAll(".reject-chapter").forEach((btn) => {
      btn.addEventListener("click", function () {
        const chapterId = this.dataset.id;
        rejectChapter(chapterId);
      });
    });
  } catch (error) {
    console.error("Lỗi khi tải chương đang chờ duyệt:", error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center">Không thể tải dữ liệu chương</td>
      </tr>
    `;
  }
}

// Duyệt chương
async function approveChapter(chapterId) {
  try {
    const response = await authorizedFetch(
      `/admin/chapters/${chapterId}/approve`,
      {
        method: "PUT",
      }
    );

    if (!response) return;

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Lỗi khi duyệt chương");
    }

    // Xóa hàng khỏi bảng
    const row = document
      .querySelector(`.approve-chapter[data-id="${chapterId}"]`)
      .closest("tr");
    row.remove();

    // Cập nhật số lượng
    const pendingCount = document.getElementById("pending-count");
    if (pendingCount) {
      const currentCount =
        parseInt(pendingCount.textContent.replace(/,/g, "")) || 0;
      pendingCount.textContent = Math.max(0, currentCount - 1).toLocaleString();
    }

    // Hiển thị thông báo
    showMessage("Đã duyệt chương thành công");
  } catch (error) {
    console.error("Lỗi khi duyệt chương:", error);
    showMessage("Đã xảy ra lỗi khi duyệt chương", "error");
  }
}

// Từ chối chương
async function rejectChapter(chapterId) {
  try {
    const response = await authorizedFetch(
      `/admin/chapters/${chapterId}/reject`,
      {
        method: "PUT",
      }
    );

    if (!response) return;

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Lỗi khi từ chối chương");
    }

    // Xóa hàng khỏi bảng
    const row = document
      .querySelector(`.reject-chapter[data-id="${chapterId}"]`)
      .closest("tr");
    row.remove();

    // Cập nhật số lượng
    const pendingCount = document.getElementById("pending-count");
    if (pendingCount) {
      const currentCount =
        parseInt(pendingCount.textContent.replace(/,/g, "")) || 0;
      pendingCount.textContent = Math.max(0, currentCount - 1).toLocaleString();
    }

    // Hiển thị thông báo
    showMessage("Đã từ chối chương thành công");
  } catch (error) {
    console.error("Lỗi khi từ chối chương:", error);
    showMessage("Đã xảy ra lỗi khi từ chối chương", "error");
  }
}

// Khởi tạo biểu đồ
function initCharts() {
  const coinChartContainer = document.getElementById("coin-sales-chart");
  const userChartContainer = document.getElementById("new-users-chart");

  loadCoinSalesChart();
  loadNewUsersChart();
}

// Tải biểu đồ xu bán
async function loadCoinSalesChart() {
  const chartContainer = document.getElementById("coin-sales-chart");
  if (!chartContainer) return;

  // Lấy năm hiện tại
  const currentYear = new Date().getFullYear();
  const yearLabel = document.getElementById("coinYearLabel");
  if (yearLabel) yearLabel.textContent = `Năm: ${currentYear}`;

  chartContainer.innerHTML = '<div class="loading">Đang tải...</div>';

  try {
    const response = await authorizedFetch(
      `/api/admin/stats/coin-sales?year=${currentYear}`
    );
    if (!response) return;
    const result = await response.json();
    if (!result.success || !result.data) {
      throw new Error("Không thể tải dữ liệu biểu đồ xu");
    }
    // result.data = [100, 200, ...] (12 phần tử)
    const data = result.data;
    if (!Array.isArray(data) || data.length !== 12) {
      chartContainer.innerHTML =
        '<p class="text-center">Không có dữ liệu trong năm này</p>';
      return;
    }
    // Render chart
    let html = '<div class="chart-data">';
    const max = getNiceMax(Math.max(...data, 1));
    data.forEach((count, i) => {
      const height = Math.min(100, (count / max) * 100);
      html += `
        <div class="chart-bar" style="height: ${height}%" title="Tháng ${
        i + 1
      }: ${count} xu">
          <div class="chart-value">${count}</div>
        </div>
      `;
    });
    html += "</div>";
    html += '<div class="chart-labels">';
    for (let i = 1; i <= 12; i++) {
      html += `<div class="chart-label">${i}</div>`;
    }
    html += "</div>";
    chartContainer.innerHTML = html;
  } catch (error) {
    console.error("Lỗi khi tải biểu đồ xu:", error);
    chartContainer.innerHTML =
      '<p class="text-center text-danger">Không thể tải dữ liệu biểu đồ</p>';
  }
}

// Tải biểu đồ người dùng mới
async function loadNewUsersChart() {
  const chartContainer = document.getElementById("new-users-chart");
  if (!chartContainer) return;

  // Lấy năm hiện tại
  const currentYear = new Date().getFullYear();
  const yearLabel = document.getElementById("currentYearLabel");
  if (yearLabel) yearLabel.textContent = `Năm: ${currentYear}`;

  chartContainer.innerHTML = '<div class="loading">Đang tải...</div>';

  try {
    const response = await authorizedFetch(
      `/api/admin/stats/new-users?year=${currentYear}`
    );
    if (!response) return;
    const result = await response.json();
    if (!result.success || !result.data) {
      throw new Error("Không thể tải dữ liệu biểu đồ người dùng");
    }
    // result.data = [4, 2, 0, ...] (12 phần tử)
    const data = result.data;
    if (!Array.isArray(data) || data.length !== 12) {
      chartContainer.innerHTML =
        '<p class="text-center">Không có dữ liệu trong năm này</p>';
      return;
    }
    // Render chart
    let html = '<div class="chart-data">';
    const max = getNiceMax(Math.max(...data, 1));
    data.forEach((count, i) => {
      const height = Math.min(100, (count / max) * 100);
      html += `
        <div class="chart-bar" style="height: ${height}%" title="Tháng ${
        i + 1
      }: ${count} người dùng">
          <div class="chart-value">${count}</div>
        </div>
      `;
    });
    html += "</div>";
    html += '<div class="chart-labels">';
    for (let i = 1; i <= 12; i++) {
      html += `<div class="chart-label">${i}</div>`;
    }
    html += "</div>";
    chartContainer.innerHTML = html;
  } catch (error) {
    console.error("Lỗi khi tải biểu đồ người dùng:", error);
    chartContainer.innerHTML =
      '<p class="text-center text-danger">Không thể tải dữ liệu biểu đồ</p>';
  }
}

function getNiceMax(max) {
  if (max <= 10) return 10;
  if (max <= 20) return 20;
  if (max <= 50) return 50;
  if (max <= 100) return 100;
  if (max <= 200) return 200;
  if (max <= 500) return 500;
  return Math.ceil(max / 1000) * 1000;
}

// Lấy class CSS cho trạng thái giao dịch
function getStatusClass(status) {
  switch (status) {
    case "completed":
      return "badge-success";
    case "pending":
      return "badge-warning";
    case "failed":
      return "badge-danger";
    case "refunded":
      return "badge-info";
    default:
      return "badge-secondary";
  }
}

// Lấy text cho trạng thái giao dịch
function getStatusText(status) {
  switch (status) {
    case "completed":
      return "Thành công";
    case "pending":
      return "Đang xử lý";
    case "failed":
      return "Thất bại";
    case "refunded":
      return "Hoàn tiền";
    default:
      return "Không xác định";
  }
}
