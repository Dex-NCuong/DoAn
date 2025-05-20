// Admin Dashboard JavaScript

// DOM Elements
const adminSidebar = document.querySelector(".admin-sidebar");
const toggleSidebarBtn = document.querySelector(".btn-toggle-sidebar");
const adminContent = document.querySelector(".admin-content");
const chartContainers = document.querySelectorAll(".chart-container");

// Định nghĩa hằng số URL của API
const API_URL = "http://localhost:5000/api";

// Biến chứa dữ liệu tổng quan của trang admin
let dashboardStats = {
  userCount: 0,
  storyCount: 0,
  chapterCount: 0,
  pendingCount: 0,
  recentTransactions: [],
  pendingChapters: [],
  salesData: [],
  newUsersData: [],
};

// Hàm khởi tạo trang admin
async function initAdminDashboard() {
  // Kiểm tra người dùng đã đăng nhập và có quyền admin không
  if (!window.auth || !window.auth.isAuthenticated()) {
    window.location.href = "/login.html?redirect=/admin";
    return;
  }

  const currentUser = window.auth.getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    window.location.href = "/";
    alert("Bạn không có quyền truy cập trang quản trị");
    return;
  }

  // Hiển thị tên người dùng
  document.getElementById("adminName").textContent = currentUser.username;

  // Tải dữ liệu tổng quan
  await loadDashboardStats();

  // Render dữ liệu
  renderStats();
  renderCharts();
  renderRecentTransactions();
  renderPendingChapters();

  // Khởi tạo các sự kiện
  initEvents();
}

// Tải dữ liệu thống kê tổng quan
async function loadDashboardStats() {
  try {
    // Lấy thống kê tổng quan
    const statsResponse = await window.auth.authorizedFetch(
      `${API_URL}/admin/stats`
    );
    const statsData = await statsResponse.json();

    if (statsResponse.ok) {
      dashboardStats.userCount = statsData.userCount;
      dashboardStats.storyCount = statsData.storyCount;
      dashboardStats.chapterCount = statsData.chapterCount;
      dashboardStats.pendingCount = statsData.pendingCount;
      dashboardStats.salesData = statsData.salesData;
      dashboardStats.newUsersData = statsData.newUsersData;
    }

    // Lấy giao dịch gần đây
    const transactionsResponse = await window.auth.authorizedFetch(
      `${API_URL}/admin/transactions/recent`
    );
    if (transactionsResponse.ok) {
      dashboardStats.recentTransactions = await transactionsResponse.json();
    }

    // Lấy các chương đang chờ duyệt
    const pendingChaptersResponse = await window.auth.authorizedFetch(
      `${API_URL}/admin/chapters/pending`
    );
    if (pendingChaptersResponse.ok) {
      dashboardStats.pendingChapters = await pendingChaptersResponse.json();
    }
  } catch (error) {
    console.error("Lỗi khi tải dữ liệu tổng quan:", error);
    // Hiển thị dữ liệu mẫu nếu có lỗi khi gọi API
    loadMockData();
  }
}

// Hiển thị các thông số thống kê
function renderStats() {
  document.getElementById("userCount").textContent = dashboardStats.userCount;
  document.getElementById("storyCount").textContent = dashboardStats.storyCount;
  document.getElementById("chapterCount").textContent =
    dashboardStats.chapterCount;
  document.getElementById("pendingCount").textContent =
    dashboardStats.pendingCount;
}

// Hiển thị biểu đồ doanh thu và người dùng mới
function renderCharts() {
  renderSalesChart();
  renderNewUsersChart();
}

// Hiển thị biểu đồ doanh thu
function renderSalesChart() {
  const salesChartCtx = document.getElementById("salesChart").getContext("2d");

  // Tạo dữ liệu cho biểu đồ doanh thu
  const salesData = dashboardStats.salesData || [
    { date: "1/7", amount: 120 },
    { date: "2/7", amount: 190 },
    { date: "3/7", amount: 85 },
    { date: "4/7", amount: 205 },
    { date: "5/7", amount: 150 },
    { date: "6/7", amount: 220 },
    { date: "7/7", amount: 180 },
  ];

  new Chart(salesChartCtx, {
    type: "line",
    data: {
      labels: salesData.map((item) => item.date),
      datasets: [
        {
          label: "Doanh thu (xu)",
          data: salesData.map((item) => item.amount),
          borderColor: "#4CAF50",
          backgroundColor: "rgba(76, 175, 80, 0.1)",
          tension: 0.3,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top" },
        title: { display: true, text: "Doanh thu 7 ngày gần đây" },
      },
      scales: {
        y: { beginAtZero: true },
      },
    },
  });
}

// Hiển thị biểu đồ người dùng mới
function renderNewUsersChart() {
  const newUsersChartCtx = document
    .getElementById("newUsersChart")
    .getContext("2d");

  // Tạo dữ liệu cho biểu đồ người dùng mới
  const newUsersData = dashboardStats.newUsersData || [
    { date: "1/7", count: 5 },
    { date: "2/7", count: 8 },
    { date: "3/7", count: 12 },
    { date: "4/7", count: 7 },
    { date: "5/7", count: 15 },
    { date: "6/7", count: 10 },
    { date: "7/7", count: 18 },
  ];

  new Chart(newUsersChartCtx, {
    type: "bar",
    data: {
      labels: newUsersData.map((item) => item.date),
      datasets: [
        {
          label: "Người dùng mới",
          data: newUsersData.map((item) => item.count),
          backgroundColor: "rgba(54, 162, 235, 0.7)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top" },
        title: { display: true, text: "Người dùng mới 7 ngày gần đây" },
      },
      scales: {
        y: { beginAtZero: true },
      },
    },
  });
}

// Hiển thị các giao dịch gần đây
function renderRecentTransactions() {
  const tableBody = document.getElementById("recentTransactionsBody");
  const transactions = dashboardStats.recentTransactions || [
    {
      _id: "T001",
      userId: { username: "user1" },
      type: "deposit",
      amount: 500,
      status: "completed",
      createdAt: "2023-07-07T10:30:00Z",
    },
    {
      _id: "T002",
      userId: { username: "user2" },
      type: "purchase",
      amount: 100,
      status: "completed",
      createdAt: "2023-07-07T09:15:00Z",
    },
    {
      _id: "T003",
      userId: { username: "user3" },
      type: "deposit",
      amount: 1000,
      status: "pending",
      createdAt: "2023-07-06T18:45:00Z",
    },
    {
      _id: "T004",
      userId: { username: "user4" },
      type: "purchase",
      amount: 50,
      status: "completed",
      createdAt: "2023-07-06T15:20:00Z",
    },
    {
      _id: "T005",
      userId: { username: "user5" },
      type: "deposit",
      amount: 200,
      status: "completed",
      createdAt: "2023-07-06T12:10:00Z",
    },
  ];

  tableBody.innerHTML = "";

  transactions.forEach((transaction) => {
    const tr = document.createElement("tr");

    // Format ngày giờ
    const date = new Date(transaction.createdAt);
    const formattedDate = `${date.getDate()}/${
      date.getMonth() + 1
    }/${date.getFullYear()} ${date.getHours()}:${String(
      date.getMinutes()
    ).padStart(2, "0")}`;

    // Xác định loại giao dịch
    const typeText = transaction.type === "deposit" ? "Nạp xu" : "Mua chương";
    const typeClass =
      transaction.type === "deposit" ? "text-success" : "text-primary";

    // Xác định trạng thái giao dịch
    const statusText =
      transaction.status === "completed" ? "Hoàn thành" : "Đang xử lý";
    const statusClass =
      transaction.status === "completed" ? "badge-success" : "badge-warning";

    tr.innerHTML = `
      <td>${transaction._id}</td>
      <td>${transaction.userId.username}</td>
      <td class="${typeClass}">${typeText}</td>
      <td>${transaction.amount} xu</td>
      <td><span class="badge ${statusClass}">${statusText}</span></td>
      <td>${formattedDate}</td>
      <td>
        <button class="btn btn-sm btn-primary view-transaction" data-id="${transaction._id}">
          <i class="fas fa-eye"></i>
        </button>
      </td>
    `;

    tableBody.appendChild(tr);
  });
}

// Hiển thị các chương đang chờ duyệt
function renderPendingChapters() {
  const tableBody = document.getElementById("pendingChaptersBody");
  const chapters = dashboardStats.pendingChapters || [
    {
      _id: "C001",
      title: "Chương 10: Hồi kết",
      storyId: { title: "Truyện phiêu lưu 1" },
      authorId: { username: "author1" },
      createdAt: "2023-07-07T08:30:00Z",
    },
    {
      _id: "C002",
      title: "Chương 5: Gặp gỡ",
      storyId: { title: "Truyện tình cảm 1" },
      authorId: { username: "author2" },
      createdAt: "2023-07-06T19:45:00Z",
    },
    {
      _id: "C003",
      title: "Chương 8: Trận chiến",
      storyId: { title: "Truyện hành động 1" },
      authorId: { username: "author1" },
      createdAt: "2023-07-06T14:20:00Z",
    },
  ];

  tableBody.innerHTML = "";

  chapters.forEach((chapter) => {
    const tr = document.createElement("tr");

    // Format ngày giờ
    const date = new Date(chapter.createdAt);
    const formattedDate = `${date.getDate()}/${
      date.getMonth() + 1
    }/${date.getFullYear()} ${date.getHours()}:${String(
      date.getMinutes()
    ).padStart(2, "0")}`;

    tr.innerHTML = `
      <td>${chapter._id}</td>
      <td>${chapter.title}</td>
      <td>${chapter.storyId.title}</td>
      <td>${chapter.authorId.username}</td>
      <td>${formattedDate}</td>
      <td>
        <button class="btn btn-sm btn-success approve-chapter" data-id="${chapter._id}">
          <i class="fas fa-check"></i>
        </button>
        <button class="btn btn-sm btn-danger reject-chapter" data-id="${chapter._id}">
          <i class="fas fa-times"></i>
        </button>
        <button class="btn btn-sm btn-primary view-chapter" data-id="${chapter._id}">
          <i class="fas fa-eye"></i>
        </button>
      </td>
    `;

    tableBody.appendChild(tr);
  });
}

// Khởi tạo các sự kiện cho trang admin
function initEvents() {
  // Sự kiện cho các nút xem giao dịch
  document.querySelectorAll(".view-transaction").forEach((button) => {
    button.addEventListener("click", (e) => {
      const transactionId = e.currentTarget.dataset.id;
      viewTransaction(transactionId);
    });
  });

  // Sự kiện cho các nút duyệt chương
  document.querySelectorAll(".approve-chapter").forEach((button) => {
    button.addEventListener("click", (e) => {
      const chapterId = e.currentTarget.dataset.id;
      approveChapter(chapterId);
    });
  });

  // Sự kiện cho các nút từ chối chương
  document.querySelectorAll(".reject-chapter").forEach((button) => {
    button.addEventListener("click", (e) => {
      const chapterId = e.currentTarget.dataset.id;
      rejectChapter(chapterId);
    });
  });

  // Sự kiện cho các nút xem chương
  document.querySelectorAll(".view-chapter").forEach((button) => {
    button.addEventListener("click", (e) => {
      const chapterId = e.currentTarget.dataset.id;
      viewChapter(chapterId);
    });
  });

  // Sự kiện cho nút đăng xuất
  document.getElementById("logoutBtn").addEventListener("click", () => {
    window.auth.logout();
    window.location.href = "/login.html";
  });
}

// Hàm xem chi tiết giao dịch
async function viewTransaction(transactionId) {
  try {
    const response = await window.auth.authorizedFetch(
      `${API_URL}/admin/transactions/${transactionId}`
    );

    if (response.ok) {
      const transaction = await response.json();
      alert(`Chi tiết giao dịch: ${JSON.stringify(transaction, null, 2)}`);
    } else {
      alert("Không thể tải thông tin giao dịch");
    }
  } catch (error) {
    console.error("Lỗi khi xem giao dịch:", error);
    alert("Đã xảy ra lỗi khi xem giao dịch");
  }
}

// Hàm duyệt chương
async function approveChapter(chapterId) {
  try {
    const response = await window.auth.authorizedFetch(
      `${API_URL}/admin/chapters/${chapterId}/approve`,
      {
        method: "PUT",
      }
    );

    if (response.ok) {
      alert("Đã duyệt chương thành công");
      await loadDashboardStats();
      renderPendingChapters();
    } else {
      alert("Không thể duyệt chương");
    }
  } catch (error) {
    console.error("Lỗi khi duyệt chương:", error);
    alert("Đã xảy ra lỗi khi duyệt chương");
  }
}

// Hàm từ chối chương
async function rejectChapter(chapterId) {
  try {
    const response = await window.auth.authorizedFetch(
      `${API_URL}/admin/chapters/${chapterId}/reject`,
      {
        method: "PUT",
      }
    );

    if (response.ok) {
      alert("Đã từ chối chương thành công");
      await loadDashboardStats();
      renderPendingChapters();
    } else {
      alert("Không thể từ chối chương");
    }
  } catch (error) {
    console.error("Lỗi khi từ chối chương:", error);
    alert("Đã xảy ra lỗi khi từ chối chương");
  }
}

// Hàm xem chi tiết chương
async function viewChapter(chapterId) {
  try {
    const response = await window.auth.authorizedFetch(
      `${API_URL}/admin/chapters/${chapterId}`
    );

    if (response.ok) {
      const chapter = await response.json();
      alert(`Chi tiết chương: ${JSON.stringify(chapter, null, 2)}`);
    } else {
      alert("Không thể tải thông tin chương");
    }
  } catch (error) {
    console.error("Lỗi khi xem chương:", error);
    alert("Đã xảy ra lỗi khi xem chương");
  }
}

// Tải dữ liệu mẫu khi không có API hoặc có lỗi
function loadMockData() {
  dashboardStats = {
    userCount: 124,
    storyCount: 45,
    chapterCount: 367,
    pendingCount: 12,
    salesData: [
      { date: "1/7", amount: 120 },
      { date: "2/7", amount: 190 },
      { date: "3/7", amount: 85 },
      { date: "4/7", amount: 205 },
      { date: "5/7", amount: 150 },
      { date: "6/7", amount: 220 },
      { date: "7/7", amount: 180 },
    ],
    newUsersData: [
      { date: "1/7", count: 5 },
      { date: "2/7", count: 8 },
      { date: "3/7", count: 12 },
      { date: "4/7", count: 7 },
      { date: "5/7", count: 15 },
      { date: "6/7", count: 10 },
      { date: "7/7", count: 18 },
    ],
    recentTransactions: [
      {
        _id: "T001",
        userId: { username: "user1" },
        type: "deposit",
        amount: 500,
        status: "completed",
        createdAt: "2023-07-07T10:30:00Z",
      },
      {
        _id: "T002",
        userId: { username: "user2" },
        type: "purchase",
        amount: 100,
        status: "completed",
        createdAt: "2023-07-07T09:15:00Z",
      },
      {
        _id: "T003",
        userId: { username: "user3" },
        type: "deposit",
        amount: 1000,
        status: "pending",
        createdAt: "2023-07-06T18:45:00Z",
      },
      {
        _id: "T004",
        userId: { username: "user4" },
        type: "purchase",
        amount: 50,
        status: "completed",
        createdAt: "2023-07-06T15:20:00Z",
      },
      {
        _id: "T005",
        userId: { username: "user5" },
        type: "deposit",
        amount: 200,
        status: "completed",
        createdAt: "2023-07-06T12:10:00Z",
      },
    ],
    pendingChapters: [
      {
        _id: "C001",
        title: "Chương 10: Hồi kết",
        storyId: { title: "Truyện phiêu lưu 1" },
        authorId: { username: "author1" },
        createdAt: "2023-07-07T08:30:00Z",
      },
      {
        _id: "C002",
        title: "Chương 5: Gặp gỡ",
        storyId: { title: "Truyện tình cảm 1" },
        authorId: { username: "author2" },
        createdAt: "2023-07-06T19:45:00Z",
      },
      {
        _id: "C003",
        title: "Chương 8: Trận chiến",
        storyId: { title: "Truyện hành động 1" },
        authorId: { username: "author1" },
        createdAt: "2023-07-06T14:20:00Z",
      },
    ],
  };
}

// Khởi tạo trang admin khi trang được tải
document.addEventListener("DOMContentLoaded", () => {
  // Đợi cho auth.js được tải và khởi tạo
  if (window.auth && window.auth.isInitialized) {
    initAdminDashboard();
  } else {
    // Đợi cho auth.js khởi tạo nếu chưa sẵn sàng
    window.addEventListener("auth_initialized", initAdminDashboard);
  }
});
