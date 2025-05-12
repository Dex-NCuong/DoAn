// User Coins JavaScript

// Check if API_URL already exists in the global scope
// If it does, use it; otherwise, create our own
if (typeof window.API_URL === "undefined") {
  console.log("API_URL not found, creating local version");
  var COINS_API_URL = "/api";
} else {
  console.log("Using global API_URL:", window.API_URL);
  var COINS_API_URL = window.API_URL;
}

// Debug logging
console.log("Coin packages module initialized");

// Các biến lưu trữ trạng thái
let selectedPackageId = null;
let selectedPaymentMethod = null;
let userBalance = 0;

// DOM Elements
const coinPackages = document.querySelectorAll(".coin-package");
const paymentOptions = document.querySelectorAll(
  'input[name="payment-method"]'
);
const checkoutButton = document.getElementById("checkout-btn");
const summaryPackageName = document.getElementById("summary-package-name");
const summaryCoins = document.getElementById("summary-coins");
const summaryPrice = document.getElementById("summary-price");
const summaryMethod = document.getElementById("summary-method");
const summaryTotal = document.getElementById("summary-total");
const currentCoinsElement = document.getElementById("current-coins");

// Initialize the coins page
document.addEventListener("DOMContentLoaded", function () {
  // Kiểm tra đăng nhập
  if (!window.auth || !window.auth.isAuthenticated()) {
    window.location.href = "/login.html?redirect=/user-coins.html";
    return;
  }

  // Lấy thông tin người dùng và số xu hiện tại
  fetchUserCoins();

  // Nạp các gói xu từ API
  fetchCoinPackages();

  // Nạp phương thức thanh toán
  loadPaymentMethods();

  // Khởi tạo nút thanh toán
  initializeCheckoutButton();

  // Ensure the coin balance is refreshed again after a short delay
  // This helps in case there's any race condition with the auth system
  setTimeout(fetchUserCoins, 1000);

  // Ẩn modal thông báo khi load trang
  var messageModal = document.getElementById("messageModal");
  if (messageModal) {
    messageModal.style.display = "none";
    // Đóng modal khi bấm dấu ×
    var closeBtn = messageModal.querySelector(".close");
    if (closeBtn) {
      closeBtn.onclick = function () {
        messageModal.style.display = "none";
      };
    }
  }
});

// Lấy số xu hiện tại của người dùng
async function fetchUserCoins() {
  try {
    console.log("Fetching user coins...");

    // Add auth token for the request
    const token = localStorage.getItem("auth_token");
    if (!token) {
      console.error("No auth token found");
      updateCoinsDisplay(0);
      return;
    }

    // First try the more specific endpoint
    try {
      const response = await fetch(`${COINS_API_URL}/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("User data received from /users/me:", data);

        if (data.coins !== undefined) {
          updateCoinsDisplay(data.coins);
          return;
        } else if (data.user && data.user.coins !== undefined) {
          updateCoinsDisplay(data.user.coins);
          return;
        }
      }
    } catch (e) {
      console.log("Error with /users/me endpoint, trying alternative:", e);
    }

    // Fallback to alternative endpoint
    const response = await fetch(`${COINS_API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user data: ${response.status}`);
    }

    const data = await response.json();
    console.log("User data received:", data);

    // Try different possible response formats
    if (data.user && typeof data.user.coins !== "undefined") {
      console.log("Setting coin display to:", data.user.coins);
      updateCoinsDisplay(data.user.coins);
    } else if (typeof data.coins !== "undefined") {
      console.log("Setting coin display to:", data.coins);
      updateCoinsDisplay(data.coins);
    } else {
      console.error("User data doesn't contain coins:", data);
      // Fallback to 0 coins
      updateCoinsDisplay(0);
    }
  } catch (error) {
    console.error("Error fetching user coins:", error);
    // Fallback to 0 coins
    updateCoinsDisplay(0);
  }
}

// Cập nhật hiển thị số xu
function updateCoinsDisplay(coins) {
  // Make sure we're working with a number
  const coinAmount = parseInt(coins) || 0;
  console.log("Updating coin display with value:", coinAmount);

  // Update the coin display in the header
  const currentBalanceElement = document.getElementById("currentBalance");
  if (currentBalanceElement) {
    currentBalanceElement.textContent = coinAmount;
    console.log("Updated currentBalance element");
  } else {
    console.error("currentBalance element not found");
  }

  // Also update the global userBalance variable for use elsewhere
  userBalance = coinAmount;
}

// Lấy danh sách gói xu từ server
async function fetchCoinPackages() {
  try {
    console.log(
      "Fetching coin packages from:",
      `${COINS_API_URL}/coin-packages`
    );

    // Fetch real data from the API
    const response = await fetch(`${COINS_API_URL}/coin-packages`);

    console.log("API response status:", response.status);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch coin packages: ${response.status} ${response.statusText}`
      );
    }

    const packages = await response.json();
    console.log("Received packages:", packages);

    if (packages && packages.length > 0) {
      // Transform API data to match our UI format
      const formattedPackages = packages.map((pkg) => {
        return {
          id: pkg._id,
          packageId: pkg.packageId,
          coins: pkg.coins,
          price: pkg.price,
          bonus: pkg.discount
            ? Math.floor((pkg.coins * pkg.discount) / 100)
            : 0,
          popular: pkg.featured || false,
          description: pkg.description || `Gói ${pkg.name}`,
        };
      });

      console.log("Formatted packages:", formattedPackages);
      renderCoinPackages(formattedPackages);
    } else {
      // If no packages received, use sample data
      console.warn("No coin packages found in API, using fallback data");
      const samplePackages = getCoinPackages();
      renderCoinPackages(samplePackages);
    }
  } catch (error) {
    console.error("Lỗi khi tải gói xu:", error);
    // Fallback to sample data in case of error
    const samplePackages = getCoinPackages();
    renderCoinPackages(samplePackages);
  }
}

// Danh sách gói xu mẫu
function getCoinPackages() {
  return [
    {
      id: 1,
      coins: 100,
      price: 20000,
      bonus: 0,
      popular: false,
      description: "Gói cơ bản cho người mới",
    },
    {
      id: 2,
      coins: 300,
      price: 50000,
      bonus: 15,
      popular: true,
      description: "Gói phổ biến, tiết kiệm 15%",
    },
    {
      id: 3,
      coins: 500,
      price: 80000,
      bonus: 25,
      popular: false,
      description: "Gói tiết kiệm, thêm 25 xu",
    },
    {
      id: 4,
      coins: 1000,
      price: 150000,
      bonus: 100,
      popular: false,
      description: "Gói cao cấp, thêm 100 xu",
    },
    {
      id: 5,
      coins: 2000,
      price: 290000,
      bonus: 300,
      popular: false,
      description: "Gói siêu tiết kiệm, thêm 300 xu",
    },
    {
      id: 6,
      coins: 5000,
      price: 700000,
      bonus: 1000,
      popular: false,
      description: "Gói VIP, thêm 1000 xu",
    },
  ];
}

// Hiển thị danh sách gói xu
function renderCoinPackages(packages) {
  const coinPackagesContainer = document.getElementById("coinPackages");
  if (!coinPackagesContainer) return;

  let packagesHTML = "";
  packages.forEach((pkg) => {
    const totalCoins = pkg.coins + pkg.bonus;
    const savePercentage =
      pkg.bonus > 0 ? Math.round((pkg.bonus / pkg.coins) * 100) : 0;
    const popularClass = pkg.popular ? "package-popular" : "";
    const popularTag = pkg.popular
      ? '<div class="popular-tag">Phổ biến</div>'
      : "";
    // Hiển thị cả packageId
    packagesHTML += `
      <div class="coin-package ${popularClass}" data-id="${
      pkg.id
    }" data-packageid="${pkg.packageId || ""}" data-coins="${
      pkg.coins
    }" data-bonus="${pkg.bonus}" data-price="${pkg.price}">
        ${popularTag}
        <div class="package-icon">
          <i class="fas fa-coins"></i>
        </div>
        <div class="package-details">
          <div class="coin-amount">${totalCoins} xu</div>
          <div class="original-coins">${pkg.coins} xu</div>
          ${
            pkg.bonus > 0
              ? `<div class="bonus-coins">+${pkg.bonus} xu (${savePercentage}%)</div>`
              : ""
          }
          <div class="price">${formatCurrency(pkg.price)}</div>
          <div class="package-description">ID: <b>${
            pkg.packageId || pkg.id
          }</b> - ${pkg.description}</div>
        </div>
      </div>
    `;
  });

  coinPackagesContainer.innerHTML = packagesHTML;

  // Thêm sự kiện cho các gói xu
  const packageElements = document.querySelectorAll(".coin-package");
  packageElements.forEach((pkg) => {
    pkg.addEventListener("click", function () {
      // Bỏ chọn tất cả các gói
      packageElements.forEach((p) => p.classList.remove("selected"));
      // Chọn gói hiện tại
      this.classList.add("selected");
      // Lưu ID gói đã chọn
      selectedPackageId = this.dataset.id;
      selectedPackageCode = this.dataset.packageid;
      // Cập nhật thông tin thanh toán
      updateSummary();
    });
  });
}

// Nạp phương thức thanh toán
function loadPaymentMethods() {
  const paymentMethods = getPaymentMethods();
  const paymentMethodsContainer = document.getElementById("paymentMethods");
  if (!paymentMethodsContainer) return;

  let methodsHTML = "";
  paymentMethods.forEach((method) => {
    methodsHTML += `
      <div class="payment-method" data-id="${method.id}">
        <input type="radio" id="${method.id}" name="payment-method" value="${
      method.id
    }">
        <label for="${method.id}">
          <span class="payment-icon">${method.image}</span>
          <span>${method.name}</span>
        </label>
        ${
          method.description
            ? `<div class="payment-description">${method.description}</div>`
            : ""
        }
      </div>
    `;
  });

  paymentMethodsContainer.innerHTML = methodsHTML;

  // Thêm sự kiện cho phương thức thanh toán
  const paymentInputs = document.querySelectorAll(
    'input[name="payment-method"]'
  );
  paymentInputs.forEach((input) => {
    input.addEventListener("change", function () {
      selectedPaymentMethod = this.value;
      updateSummary();
    });
  });
}

// Danh sách phương thức thanh toán
function getPaymentMethods() {
  return [
    {
      id: "vnpay",
      name: "VNPAY",
      image: '<i class="fas fa-university fa-2x"></i>',
      description:
        "Thanh toán qua VNPAY - Hỗ trợ thẻ ATM, Visa, MasterCard, QR Code",
    },
  ];
}

// Cập nhật thông tin thanh toán
function updateSummary() {
  const summaryCoins = document.getElementById("summaryCoins");
  const summaryPrice = document.getElementById("summaryPrice");
  const checkoutButton = document.getElementById("checkoutButton");

  // Tìm gói đã chọn
  const selectedPackage = document.querySelector(".coin-package.selected");

  if (selectedPackage && summaryCoins && summaryPrice) {
    const coins = parseInt(selectedPackage.dataset.coins);
    const bonus = parseInt(selectedPackage.dataset.bonus);
    const price = parseInt(selectedPackage.dataset.price);

    summaryCoins.textContent = `${coins} + ${bonus} = ${coins + bonus}`;
    summaryPrice.textContent = formatCurrency(price);

    // Cập nhật trạng thái nút thanh toán
    if (checkoutButton) {
      checkoutButton.disabled = !selectedPaymentMethod;
    }
  } else if (summaryCoins && summaryPrice) {
    summaryCoins.textContent = "0";
    summaryPrice.textContent = formatCurrency(0);

    // Disable nút thanh toán nếu chưa chọn gói
    if (checkoutButton) {
      checkoutButton.disabled = true;
    }
  }
}

// Khởi tạo nút thanh toán
function initializeCheckoutButton() {
  const checkoutButton = document.getElementById("checkoutButton");

  if (checkoutButton) {
    checkoutButton.addEventListener("click", function () {
      if (!selectedPackageId || !selectedPaymentMethod) {
        alert("Vui lòng chọn gói xu và phương thức thanh toán");
        return;
      }

      // Lấy thông tin gói đã chọn
      const selectedPackage = document.querySelector(".coin-package.selected");
      const coins = parseInt(selectedPackage.dataset.coins);
      const bonus = parseInt(selectedPackage.dataset.bonus);
      const price = parseInt(selectedPackage.dataset.price);

      // Hiển thị thông báo xác nhận
      if (
        confirm(
          `Bạn sẽ mua ${coins} xu (được thêm ${bonus} xu) với giá ${formatCurrency(
            price
          )}. Xác nhận thanh toán?`
        )
      ) {
        // Chuyển sang trang VNPAY
        const params = new URLSearchParams({
          packageId: selectedPackageCode,
          coins: coins,
          bonus: bonus,
          price: price,
        });
        window.location.href = `vnpay-payment.html?${params.toString()}`;
      }
    });
  }
}

// Định dạng tiền tệ
function formatCurrency(amount) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(amount);
}

// Hiển thị loading
function showLoading(message = "Đang xử lý...") {
  const loadingEl = document.createElement("div");
  loadingEl.id = "loading-overlay";
  loadingEl.innerHTML = `
    <div class="loading-container">
      <div class="spinner-border text-primary" role="status">
        <span class="sr-only">Loading...</span>
      </div>
      <p>${message}</p>
    </div>
  `;
  document.body.appendChild(loadingEl);
}

// Ẩn loading
function hideLoading() {
  const loadingEl = document.getElementById("loading-overlay");
  if (loadingEl) {
    loadingEl.remove();
  }
}

// Hàm showMessage sử dụng modal
function showMessage(message, type = "info") {
  var messageModal = document.getElementById("messageModal");
  var messageText = document.getElementById("messageText");
  if (messageModal && messageText) {
    messageText.textContent = message;
    messageModal.style.display = "block";
  } else {
    alert(message); // fallback nếu không có modal
  }
}

// Hiển thị thông báo thanh toán thành công
function showPaymentSuccess(transaction) {
  // Tạo modal thông báo thành công
  const modalEl = document.createElement("div");
  modalEl.className = "modal fade";
  modalEl.id = "successModal";
  modalEl.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header bg-success text-white">
          <h5 class="modal-title">Thanh toán thành công</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body text-center">
          <div class="success-icon mb-4">
            <i class="fas fa-check-circle fa-5x text-success"></i>
          </div>
          <h4>Chúc mừng!</h4>
          <p>Bạn đã nạp thành công <strong>${
            transaction.coins
          } xu</strong> vào tài khoản.</p>
          <p>Mã giao dịch: <strong>${transaction.id}</strong></p>
          <p>Thời gian: <strong>${new Date(
            transaction.completedAt
          ).toLocaleString()}</strong></p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">Đóng</button>
          <button type="button" class="btn btn-primary" onclick="window.location.reload()">Tiếp tục mua</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modalEl);

  // Hiển thị modal
  $("#successModal").modal("show");

  // Xóa modal khi đóng
  $("#successModal").on("hidden.bs.modal", function () {
    $(this).remove();

    // Reset form
    document
      .querySelectorAll(".coin-package")
      .forEach((pkg) => pkg.classList.remove("selected"));
    document
      .querySelectorAll('input[name="payment-method"]')
      .forEach((input) => (input.checked = false));
    selectedPackageId = null;
    selectedPaymentMethod = null;
    updateSummary();
  });
}
