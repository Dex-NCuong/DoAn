// DOM Elements
let usernameElement,
  userCoinsElement,
  logoutBtn,
  transactionsTableElement,
  transactionTableBody,
  loadingElement,
  noTransactionsElement,
  paginationElement,
  typeFilterElement,
  fromDateElement,
  toDateElement,
  applyFilterBtn,
  resetFilterBtn;

// User token and data
let token;

// Transactions data
let transactions = [];
let currentPage = 1;
const itemsPerPage = 10;

// Initialize page
document.addEventListener("DOMContentLoaded", () => {
  // Check if user is logged in
  token = localStorage.getItem("auth_token");
  const userData = JSON.parse(localStorage.getItem("user") || "null");

  if (!token || !userData) {
    window.location.href = "/login.html?redirect=/user-transactions.html";
    return;
  }

  // Get DOM elements
  usernameElement = document.getElementById("username");
  userCoinsElement = document.getElementById("user-coins");
  logoutBtn = document.getElementById("logout-btn");
  transactionsTableElement = document.getElementById("transactions-table");
  transactionTableBody = document.getElementById("transaction-body");
  loadingElement = document.getElementById("loading");
  noTransactionsElement = document.getElementById("no-transactions");
  paginationElement = document.getElementById("pagination");

  // Filter elements
  typeFilterElement = document.getElementById("filter-type");
  fromDateElement = document.getElementById("filter-from-date");
  toDateElement = document.getElementById("filter-to-date");
  applyFilterBtn = document.getElementById("apply-filter");
  resetFilterBtn = document.getElementById("reset-filter");

  // Set default date range (last 30 days)
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  fromDateElement.valueAsDate = thirtyDaysAgo;
  toDateElement.valueAsDate = today;

  // Set user data
  usernameElement.textContent = userData.username;
  userCoinsElement.textContent = `${userData.coins || 0} xu`;

  // Add event listeners
  logoutBtn.addEventListener("click", logout);

  // Filter events
  applyFilterBtn.addEventListener("click", () => {
    loadTransactions();
  });

  resetFilterBtn.addEventListener("click", () => {
    typeFilterElement.value = "all";
    fromDateElement.valueAsDate = thirtyDaysAgo;
    toDateElement.valueAsDate = today;
    loadTransactions();
  });

  // Test data generation (development only)
  const createTestDataBtn = document.getElementById("create-test-data");
  if (createTestDataBtn) {
    createTestDataBtn.addEventListener("click", async () => {
      try {
        createTestDataBtn.disabled = true;
        createTestDataBtn.textContent = "Đang tạo...";

        const response = await fetch("/api/transactions/test/create-samples", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (data.success) {
          alert("Đã tạo 5 giao dịch mẫu thành công!");
          loadTransactions();
        } else {
          alert("Lỗi: " + data.message);
        }
      } catch (error) {
        console.error("Error creating test data:", error);
        alert("Đã xảy ra lỗi khi tạo dữ liệu test.");
      } finally {
        createTestDataBtn.disabled = false;
        createTestDataBtn.textContent = "Tạo dữ liệu test";
      }
    });
  }

  // Load initial data
  loadTransactions();
});

// Load transactions with filters
async function loadTransactions(page = 1) {
  try {
    // Show loading UI
    loadingElement.style.display = "block";
    transactionsTableElement.style.display = "none";
    noTransactionsElement.style.display = "none";
    paginationElement.style.display = "none";

    // Get filter values
    let typeFilter = typeFilterElement.value;
    // Map tiếng Việt sang type tiếng Anh đúng với backend
    const typeMap = {
      "Mua chương": "usage",
      "Nạp xu": "deposit",
      purchase: "usage", // nếu có
    };
    if (typeMap[typeFilter]) {
      typeFilter = typeMap[typeFilter];
    }
    const fromDate = fromDateElement.value;
    const toDate = toDateElement.value;

    // Build query params
    const params = new URLSearchParams();
    if (typeFilter !== "all") {
      params.append("type", typeFilter);
    }
    if (fromDate) {
      params.append("fromDate", fromDate);
    }
    if (toDate) {
      params.append("toDate", toDate);
    }

    // Fetch transactions from API
    const response = await fetch(
      `/api/transactions/history?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (data.success) {
      // Store transactions
      const transactions = data.transactions;

      // Hide loading UI
      loadingElement.style.display = "none";

      if (transactions.length > 0) {
        // Calculate and display transaction summaries
        calculateTransactionSummary(transactions);

        // Display transactions
        transactionsTableElement.style.display = "table";
        displayTransactions(transactions, page);
      } else {
        // Show no transactions message
        noTransactionsElement.style.display = "block";
      }

      // Sau khi load xong giao dịch, cập nhật lại số xu dưới avatar từ API mới nhất
      const token = localStorage.getItem("auth_token");
      if (token) {
        const response = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.user && typeof data.user.coins !== "undefined") {
            userCoinsElement.textContent = `${data.user.coins} xu`;
            // Đồng bộ lại localStorage nếu cần
            const userData = JSON.parse(localStorage.getItem("user") || "null");
            if (userData) {
              userData.coins = data.user.coins;
              localStorage.setItem("user", JSON.stringify(userData));
            }
          }
        }
      }
    } else {
      throw new Error(data.message || "Đã xảy ra lỗi khi tải dữ liệu.");
    }
  } catch (error) {
    console.error("Error loading transactions:", error);
    showErrorMessage(
      error.message || "Đã xảy ra lỗi khi tải dữ liệu giao dịch."
    );
    loadingElement.style.display = "none";
  }
}

// Calculate and display transaction summary
function calculateTransactionSummary(transactions) {
  let totalIncome = 0;
  let totalExpense = 0;

  transactions.forEach((transaction) => {
    if (transaction.status !== "completed") return;
    const value =
      typeof transaction.coins === "number"
        ? transaction.coins
        : transaction.amount;
    if (["deposit", "reward"].includes(transaction.type)) {
      totalIncome += value;
    } else if (["purchase", "usage"].includes(transaction.type)) {
      totalExpense += value;
    }
  });

  const balance = totalIncome - totalExpense;

  document.getElementById("total-income").textContent = `${totalIncome} xu`;
  document.getElementById("total-expense").textContent = `${totalExpense} xu`;
  document.getElementById("current-balance").textContent = `${balance} xu`;
}

// Display transactions in the table
function displayTransactions(transactions, page = 1) {
  const transactionsPerPage = 10;
  const startIndex = (page - 1) * transactionsPerPage;
  const endIndex = page * transactionsPerPage;
  const paginatedTransactions = transactions.slice(startIndex, endIndex);

  transactionTableBody.innerHTML = "";

  if (paginatedTransactions.length === 0) {
    noTransactionsElement.style.display = "block";
    paginationElement.style.display = "none";
    return;
  }

  noTransactionsElement.style.display = "none";

  paginatedTransactions.forEach((transaction) => {
    const row = document.createElement("tr");
    const date = new Date(transaction.createdAt);
    const formattedDate = `${date.toLocaleDateString(
      "vi-VN"
    )} ${date.toLocaleTimeString("vi-VN")}`;
    const isPositive = ["deposit", "refund", "reward"].includes(
      transaction.type
    );
    const amountClass = isPositive ? "amount-positive" : "amount-negative";
    const amountPrefix = isPositive ? "+" : "-";
    const value =
      typeof transaction.coins === "number"
        ? transaction.coins
        : transaction.amount;
    row.innerHTML = `
      <td>${formattedDate}</td>
      <td><span class="transaction-type">${getTransactionTypeText(
        transaction.type
      )}</span></td>
      <td class="${amountClass}">${amountPrefix}${Math.abs(value)} xu</td>
      <td><span class="transaction-status ${
        transaction.status
      }">${getTransactionStatusText(transaction.status)}</span></td>
    `;
    transactionTableBody.appendChild(row);
  });
  createPagination(transactions.length, transactionsPerPage, page);
  paginationElement.style.display =
    transactions.length > transactionsPerPage ? "flex" : "none";
}

// Get transaction type display text
function getTransactionTypeText(type) {
  const typeMap = {
    deposit: "Nạp xu",
    purchase: "Mua chapter",
    usage: "Mua chương",
    refund: "Hoàn tiền",
    reward: "Thưởng",
  };
  return typeMap[type] || type;
}

// Get transaction status display text
function getTransactionStatusText(status) {
  const statusMap = {
    pending: "Đang xử lý",
    completed: "Hoàn thành",
    failed: "Thất bại",
    refunded: "Đã hoàn tiền",
  };
  return statusMap[status] || status;
}

// Create pagination controls
function createPagination(totalItems, itemsPerPage, currentPage) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  paginationElement.innerHTML = "";

  if (totalPages <= 1) {
    paginationElement.style.display = "none";
    return;
  }

  // Add Previous button
  const prevBtn = document.createElement("a");
  prevBtn.href = "#";
  prevBtn.classList.add("pagination-item");
  prevBtn.innerHTML = "&laquo;";
  prevBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (currentPage > 1) {
      loadTransactions(currentPage - 1);
    }
  });
  paginationElement.appendChild(prevBtn);

  // Add page numbers
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);

  for (let i = startPage; i <= endPage; i++) {
    const pageLink = document.createElement("a");
    pageLink.href = "#";
    pageLink.textContent = i;
    pageLink.classList.add("pagination-item");

    if (i === currentPage) {
      pageLink.classList.add("active");
    }

    pageLink.addEventListener("click", (e) => {
      e.preventDefault();
      loadTransactions(i);
    });
    paginationElement.appendChild(pageLink);
  }

  // Add Next button
  const nextBtn = document.createElement("a");
  nextBtn.href = "#";
  nextBtn.classList.add("pagination-item");
  nextBtn.innerHTML = "&raquo;";
  nextBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (currentPage < totalPages) {
      loadTransactions(currentPage + 1);
    }
  });
  paginationElement.appendChild(nextBtn);

  paginationElement.style.display = "flex";
}

// Show error message
function showErrorMessage(message) {
  const errorElement = document.getElementById("error-message");
  if (!errorElement) {
    // Create error element if it doesn't exist
    const errorDiv = document.createElement("div");
    errorDiv.id = "error-message";
    errorDiv.className = "error-message";
    errorDiv.innerHTML = `
      <div class="error-content">
        <p>${message}</p>
        <button id="retry-btn" class="btn btn-primary">Thử lại</button>
      </div>
    `;
    document.querySelector(".profile-content").prepend(errorDiv);

    // Add retry button event listener
    document.getElementById("retry-btn").addEventListener("click", () => {
      errorDiv.remove();
      loadTransactions();
    });
  } else {
    // Update existing error message
    errorElement.querySelector("p").textContent = message;
    errorElement.style.display = "block";
  }
}

// Logout function
function logout() {
  // Clear user data from localStorage
  localStorage.removeItem("auth_token");
  localStorage.removeItem("user");

  // Redirect to homepage
  window.location.href = "/";
}

// Thêm hàm cập nhật xu sau khi xóa transaction
async function refreshUserCoins() {
  const token = localStorage.getItem("auth_token");
  if (!token) return;
  try {
    const res = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success && data.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
      if (userCoinsElement)
        userCoinsElement.textContent = `${data.user.coins} xu`;
    }
  } catch (e) {
    console.error("Không thể cập nhật xu:", e);
  }
}
