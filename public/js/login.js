// Đợi cho trang web tải xong
document.addEventListener("DOMContentLoaded", function () {
  // Lấy form đăng nhập
  const loginForm = document.getElementById("login-form");

  // Sử dụng URL tương đối (đang ở cùng nguồn với server)
  const API_URL = "/api";

  console.log("Form đăng nhập:", loginForm ? "Đã tìm thấy" : "Không tìm thấy");

  // Kiểm tra xem form có tồn tại không
  if (loginForm) {
    // Thêm sự kiện submit cho form
    loginForm.addEventListener("submit", async function (e) {
      // Ngăn chặn hành vi mặc định của form
      e.preventDefault();
      console.log("Form đăng nhập được submit");

      // Lấy giá trị từ form
      const emailInput =
        document.getElementById("email") || document.getElementById("username");
      const passwordInput = document.getElementById("password");
      const errorElement =
        document.getElementById("error-message") ||
        document.querySelector(".auth-error");

      console.log("Dữ liệu form:", {
        email: emailInput ? emailInput.value.trim() : null,
        password: passwordInput ? passwordInput.value : null,
      });

      // Kiểm tra dữ liệu nhập vào
      if (!emailInput || !passwordInput) {
        console.error("Missing form fields");
        if (errorElement) {
          errorElement.textContent = "Lỗi: Không tìm thấy các trường form";
          errorElement.style.display = "block";
        }
        return;
      }

      // Ẩn thông báo lỗi
      hideError(errorElement);

      // Hiển thị trạng thái đang tải
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = "Đang đăng nhập...";

      // Chuẩn bị dữ liệu
      const email = emailInput.value.trim();
      const password = passwordInput.value;

      // Kiểm tra dữ liệu nhập vào
      if (!email || !password) {
        if (errorElement) {
          errorElement.textContent = "Vui lòng nhập email và mật khẩu";
          errorElement.style.display = "block";
        }
        return;
      }

      try {
        // Sử dụng fetch API thay vì XMLHttpRequest
        const loginURL = `${API_URL}/auth/login`;
        console.log("Đang gửi request đến:", loginURL);

        const response = await fetch(loginURL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        console.log("Parsed data:", data);

        if (data.success && data.token) {
          console.log("Login successful, token received");

          // Ensure token is stored correctly without any extra quotes or spaces
          const cleanToken = data.token.trim();
          localStorage.setItem("auth_token", cleanToken);
          console.log(
            "Token stored in localStorage (first 20 chars):",
            cleanToken.substring(0, 20) + "..."
          );

          // Store user data
          if (data.user) {
            // Ensure the user object has default values for missing fields
            const user = {
              ...data.user,
              avatar: data.user.avatar || "images/default-avatar.jpg",
              coins: data.user.coins || 0,
            };

            localStorage.setItem("user", JSON.stringify(user));
            localStorage.setItem("token_timestamp", new Date().getTime());
          }

          // Chuyển hướng đến trang chủ
          const redirectUrl =
            new URLSearchParams(window.location.search).get("redirect") || "/";
          window.location.href = redirectUrl;
        } else {
          showError(
            errorElement,
            data.message || "Email hoặc mật khẩu không chính xác"
          );
        }
      } catch (error) {
        console.error("Login error:", error);
        showError(errorElement, "Lỗi kết nối, vui lòng thử lại sau");
      } finally {
        // Khôi phục trạng thái nút
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    });
  } else {
    console.error("Không tìm thấy form đăng nhập");
  }

  // Modal Quên mật khẩu
  const forgotPasswordLink = document.getElementById("forgot-password-link");
  const forgotPasswordModal = document.getElementById("forgot-password-modal");
  const closeForgotModal = document.getElementById("close-forgot-modal");
  const forgotPasswordForm = document.getElementById("forgot-password-form");
  const forgotPasswordMessage = document.getElementById(
    "forgot-password-message"
  );

  if (forgotPasswordLink && forgotPasswordModal && closeForgotModal) {
    forgotPasswordLink.onclick = function (e) {
      e.preventDefault();
      forgotPasswordModal.style.display = "block";
      forgotPasswordMessage.textContent = "";
    };
    closeForgotModal.onclick = function () {
      forgotPasswordModal.style.display = "none";
    };
    window.onclick = function (event) {
      if (event.target === forgotPasswordModal) {
        forgotPasswordModal.style.display = "none";
      }
    };
  }

  if (forgotPasswordForm) {
    forgotPasswordForm.onsubmit = async function (e) {
      e.preventDefault();
      const email = document.getElementById("forgot-email").value.trim();
      forgotPasswordMessage.style.color = "green";
      forgotPasswordMessage.textContent = "Đang gửi email...";
      try {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (data.success) {
          forgotPasswordMessage.style.color = "green";
          forgotPasswordMessage.textContent =
            "Đã gửi liên kết đặt lại mật khẩu tới email nếu tồn tại.";
        } else {
          forgotPasswordMessage.style.color = "red";
          forgotPasswordMessage.textContent = data.message || "Có lỗi xảy ra.";
        }
      } catch (err) {
        forgotPasswordMessage.style.color = "red";
        forgotPasswordMessage.textContent = "Lỗi kết nối, vui lòng thử lại.";
      }
    };
  }
});

// Hàm hiển thị thông báo lỗi
function showError(element, message) {
  if (element) {
    element.textContent = message;
    element.style.display = "block";
    console.log("Hiển thị lỗi:", message);
  } else {
    console.error("Không tìm thấy phần tử hiển thị lỗi");
  }
}

// Hàm ẩn thông báo lỗi
function hideError(element) {
  if (element) {
    element.textContent = "";
    element.style.display = "none";
  }
}
