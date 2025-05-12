// Admin Settings Management

// DOM ready
document.addEventListener("DOMContentLoaded", function () {
  // Kiểm tra quyền admin
  if (!checkAdminAuth()) return;

  // Tải cài đặt
  loadSettings();

  // Khởi tạo form
  initSettingsForm();
});

// Khởi tạo form
function initSettingsForm() {
  // Form cài đặt chung
  const generalForm = document.getElementById("general-settings-form");
  if (generalForm) {
    generalForm.addEventListener("submit", function (e) {
      e.preventDefault();
      saveGeneralSettings();
    });
  }

  // Form cài đặt xu
  const coinForm = document.getElementById("coin-settings-form");
  if (coinForm) {
    coinForm.addEventListener("submit", function (e) {
      e.preventDefault();
      saveCoinSettings();
    });
  }

  // Form cài đặt email
  const emailForm = document.getElementById("email-settings-form");
  if (emailForm) {
    emailForm.addEventListener("submit", function (e) {
      e.preventDefault();
      saveEmailSettings();
    });
  }

  // Nút reset
  document.querySelectorAll(".reset-settings").forEach((button) => {
    button.addEventListener("click", function () {
      const type = this.dataset.type;
      resetSettings(type);
    });
  });

  // Nút test email
  const testEmailBtn = document.getElementById("test-email-btn");
  if (testEmailBtn) {
    testEmailBtn.addEventListener("click", testEmailConfig);
  }
}

// Tải cài đặt
async function loadSettings() {
  try {
    // Trong môi trường thực tế, sẽ gọi API
    // const response = await authorizedFetch(`${API_URL}/admin/settings`);
    // const settings = await response.json();

    // Giả lập dữ liệu
    await new Promise((resolve) => setTimeout(resolve, 600));
    const settings = generateMockSettings();

    // Điền dữ liệu vào form
    populateSettingsForm(settings);
  } catch (error) {
    console.error("Lỗi khi tải cài đặt:", error);
    showMessage("Đã xảy ra lỗi khi tải thông tin cài đặt", "error");
  }
}

// Điền dữ liệu vào form
function populateSettingsForm(settings) {
  // Cài đặt chung
  if (settings.general) {
    document.getElementById("site-name").value =
      settings.general.siteName || "";
    document.getElementById("site-description").value =
      settings.general.siteDescription || "";
    document.getElementById("contact-email").value =
      settings.general.contactEmail || "";
    document.getElementById("maintenance-mode").checked =
      settings.general.maintenanceMode || false;
  }

  // Cài đặt xu
  if (settings.coins) {
    document.getElementById("chapter-price").value =
      settings.coins.defaultChapterPrice || 5;
    document.getElementById("referral-bonus").value =
      settings.coins.referralBonus || 50;
    document.getElementById("daily-check-in").value =
      settings.coins.dailyCheckInReward || 10;
    document.getElementById("enable-free-chapters").checked =
      settings.coins.enableFreeChapters !== false;
    document.getElementById("free-chapters-count").value =
      settings.coins.freeChaptersCount || 3;
  }

  // Cài đặt email
  if (settings.email) {
    document.getElementById("smtp-host").value = settings.email.smtpHost || "";
    document.getElementById("smtp-port").value = settings.email.smtpPort || "";
    document.getElementById("smtp-user").value = settings.email.smtpUser || "";
    document.getElementById("smtp-pass").value = settings.email.smtpPassword
      ? "****"
      : "";
    document.getElementById("from-email").value =
      settings.email.fromEmail || "";
    document.getElementById("from-name").value = settings.email.fromName || "";
    document.getElementById("email-encryption").value =
      settings.email.encryption || "tls";
  }
}

// Lưu cài đặt chung
async function saveGeneralSettings() {
  try {
    const generalSettings = {
      siteName: document.getElementById("site-name").value,
      siteDescription: document.getElementById("site-description").value,
      contactEmail: document.getElementById("contact-email").value,
      maintenanceMode: document.getElementById("maintenance-mode").checked,
    };

    // Validate
    if (!generalSettings.siteName) {
      showMessage("Tên website không được để trống", "error");
      return;
    }

    // Trong môi trường thực tế, sẽ gọi API
    // const response = await authorizedFetch(`${API_URL}/admin/settings/general`, {
    //   method: "PUT",
    //   headers: {
    //     "Content-Type": "application/json"
    //   },
    //   body: JSON.stringify(generalSettings)
    // });
    //
    // const result = await response.json();

    // Giả lập API
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log("Cài đặt chung đã được lưu:", generalSettings);

    // Hiển thị thông báo
    showMessage("Đã lưu cài đặt chung thành công");
  } catch (error) {
    console.error("Lỗi khi lưu cài đặt chung:", error);
    showMessage("Đã xảy ra lỗi khi lưu cài đặt chung", "error");
  }
}

// Lưu cài đặt xu
async function saveCoinSettings() {
  try {
    const coinSettings = {
      defaultChapterPrice:
        parseInt(document.getElementById("chapter-price").value) || 5,
      referralBonus:
        parseInt(document.getElementById("referral-bonus").value) || 50,
      dailyCheckInReward:
        parseInt(document.getElementById("daily-check-in").value) || 10,
      enableFreeChapters: document.getElementById("enable-free-chapters")
        .checked,
      freeChaptersCount:
        parseInt(document.getElementById("free-chapters-count").value) || 3,
    };

    // Validate
    if (coinSettings.defaultChapterPrice <= 0) {
      showMessage("Giá chương phải lớn hơn 0", "error");
      return;
    }

    // Trong môi trường thực tế, sẽ gọi API
    // const response = await authorizedFetch(`${API_URL}/admin/settings/coins`, {
    //   method: "PUT",
    //   headers: {
    //     "Content-Type": "application/json"
    //   },
    //   body: JSON.stringify(coinSettings)
    // });
    //
    // const result = await response.json();

    // Giả lập API
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log("Cài đặt xu đã được lưu:", coinSettings);

    // Hiển thị thông báo
    showMessage("Đã lưu cài đặt xu thành công");
  } catch (error) {
    console.error("Lỗi khi lưu cài đặt xu:", error);
    showMessage("Đã xảy ra lỗi khi lưu cài đặt xu", "error");
  }
}

// Lưu cài đặt email
async function saveEmailSettings() {
  try {
    const emailSettings = {
      smtpHost: document.getElementById("smtp-host").value,
      smtpPort: document.getElementById("smtp-port").value,
      smtpUser: document.getElementById("smtp-user").value,
      fromEmail: document.getElementById("from-email").value,
      fromName: document.getElementById("from-name").value,
      encryption: document.getElementById("email-encryption").value,
    };

    // Chỉ cập nhật mật khẩu nếu người dùng nhập mới
    const smtpPass = document.getElementById("smtp-pass").value;
    if (smtpPass && smtpPass !== "****") {
      emailSettings.smtpPassword = smtpPass;
    }

    // Validate
    if (!emailSettings.smtpHost || !emailSettings.fromEmail) {
      showMessage("SMTP Host và Email người gửi không được để trống", "error");
      return;
    }

    // Trong môi trường thực tế, sẽ gọi API
    // const response = await authorizedFetch(`${API_URL}/admin/settings/email`, {
    //   method: "PUT",
    //   headers: {
    //     "Content-Type": "application/json"
    //   },
    //   body: JSON.stringify(emailSettings)
    // });
    //
    // const result = await response.json();

    // Giả lập API
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log("Cài đặt email đã được lưu:", emailSettings);

    // Hiển thị thông báo
    showMessage("Đã lưu cài đặt email thành công");
  } catch (error) {
    console.error("Lỗi khi lưu cài đặt email:", error);
    showMessage("Đã xảy ra lỗi khi lưu cài đặt email", "error");
  }
}

// Reset cài đặt
async function resetSettings(type) {
  // Xác nhận trước khi reset
  if (
    !confirm(`Bạn có chắc chắn muốn khôi phục cài đặt ${type} về mặc định?`)
  ) {
    return;
  }

  try {
    // Trong môi trường thực tế, sẽ gọi API
    // const response = await authorizedFetch(`${API_URL}/admin/settings/${type}/reset`, {
    //   method: "POST"
    // });
    //
    // const result = await response.json();

    // Giả lập API
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log(`Đã reset cài đặt ${type}`);

    // Tải lại cài đặt
    loadSettings();

    // Hiển thị thông báo
    showMessage(`Đã khôi phục cài đặt ${type} về mặc định`);
  } catch (error) {
    console.error(`Lỗi khi reset cài đặt ${type}:`, error);
    showMessage(`Đã xảy ra lỗi khi khôi phục cài đặt ${type}`, "error");
  }
}

// Test cấu hình email
async function testEmailConfig() {
  // Lấy email test
  const testEmail = prompt("Nhập địa chỉ email để gửi thử:");
  if (!testEmail) return;

  try {
    // Trong môi trường thực tế, sẽ gọi API
    // const response = await authorizedFetch(`${API_URL}/admin/settings/email/test`, {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json"
    //   },
    //   body: JSON.stringify({ testEmail })
    // });
    //
    // const result = await response.json();

    // Giả lập API
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log(`Đã gửi email test đến ${testEmail}`);

    // Hiển thị thông báo
    showMessage(
      `Đã gửi email thử nghiệm đến ${testEmail}, vui lòng kiểm tra hộp thư đến`
    );
  } catch (error) {
    console.error("Lỗi khi gửi email test:", error);
    showMessage("Đã xảy ra lỗi khi gửi email thử nghiệm", "error");
  }
}

// Giả lập dữ liệu cài đặt
function generateMockSettings() {
  return {
    general: {
      siteName: "Truyện Full",
      siteDescription:
        "Đọc truyện online, đọc truyện chữ, truyện hay, truyện full. Website luôn cập nhật những bộ truyện mới, truyện VIP và nhiều thể loại truyện khác nhau.",
      contactEmail: "contact@truyenfull.com",
      maintenanceMode: false,
    },
    coins: {
      defaultChapterPrice: 5,
      referralBonus: 50,
      dailyCheckInReward: 10,
      enableFreeChapters: true,
      freeChaptersCount: 3,
    },
    email: {
      smtpHost: "smtp.gmail.com",
      smtpPort: "587",
      smtpUser: "notifications@truyenfull.com",
      smtpPassword: "password123",
      fromEmail: "no-reply@truyenfull.com",
      fromName: "Truyện Full",
      encryption: "tls",
    },
  };
}
