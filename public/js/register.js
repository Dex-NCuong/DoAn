// Đợi cho trang web tải xong
document.addEventListener("DOMContentLoaded", function () {
  // Lấy form đăng ký
  const registerForm = document.getElementById("register-form");

  // Sử dụng URL tương đối từ auth.js nếu có sẵn
  const API_URL =
    window.auth && window.auth.API_URL ? window.auth.API_URL : "/api";

  console.log("Form đăng ký:", registerForm ? "Đã tìm thấy" : "Không tìm thấy");

  // Kiểm tra xem form có tồn tại không
  if (registerForm) {
    // Thêm sự kiện submit cho form
    registerForm.addEventListener("submit", function (e) {
      // Ngăn chặn hành vi mặc định của form
      e.preventDefault();
      console.log("Form đăng ký được submit");

      // Lấy giá trị từ form
      const username = document.getElementById("username").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirm-password").value;
      const errorElement = document.getElementById("error-message");

      console.log("Dữ liệu form:", { username, email, password: "***" });

      // Kiểm tra dữ liệu nhập vào
      if (!username || !email || !password || !confirmPassword) {
        showError(errorElement, "Vui lòng điền đầy đủ thông tin");
        return;
      }

      if (password !== confirmPassword) {
        showError(errorElement, "Mật khẩu xác nhận không khớp");
        return;
      }

      // Ẩn thông báo lỗi
      hideError(errorElement);

      // Hiển thị trạng thái đang tải
      const submitBtn = registerForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = "Đang đăng ký...";

      // Chuẩn bị dữ liệu
      const userData = {
        username: username,
        email: email,
        password: password,
      };

      // Sử dụng fetch API thay vì XMLHttpRequest
      const registerURL = `${API_URL}/auth/register`;
      console.log("Đang gửi request đến:", registerURL);

      fetch(registerURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      })
        .then((response) => {
          console.log("Status:", response.status);
          console.log("Content-Type:", response.headers.get("content-type"));

          // Kiểm tra content-type để đảm bảo đây là JSON
          const contentType = response.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Server trả về định dạng không phải JSON");
          }

          return response.json();
        })
        .then((data) => {
          console.log("Parsed data:", data);

          if (data.success) {
            // Chỉ lưu token nếu có (chỉ khi đăng nhập thành công, không phải đăng ký chờ xác thực)
            if (data.token && data.user) {
              localStorage.setItem("auth_token", data.token);
              localStorage.setItem("user", JSON.stringify(data.user));
              if (
                window.auth &&
                typeof window.auth.updateCurrentUser === "function"
              ) {
                window.auth.updateCurrentUser(data.user);
              }
            }
            // Thông báo xác thực email
            if (verifyInfo) {
              verifyInfo.textContent =
                "Hãy xác thực email của bạn! Vui lòng kiểm tra hộp thư.";
              verifyInfo.style.display = "block";
              var verifyGuide = document.getElementById("verify-guide");
              if (verifyGuide) verifyGuide.style.display = "block";
            } else {
              alert("Hãy xác thực email của bạn! Vui lòng kiểm tra hộp thư.");
            }
            registerForm.reset();
            return;
          } else {
            showError(
              errorElement,
              data.message || "Đã xảy ra lỗi khi đăng ký"
            );
          }
        })
        .catch((error) => {
          console.error("Lỗi đăng ký:", error);
          showError(
            errorElement,
            "Lỗi kết nối: Vui lòng đảm bảo server đang chạy"
          );
        })
        .finally(() => {
          // Khôi phục trạng thái nút
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        });
    });
  } else {
    console.error("Không tìm thấy form đăng ký");
  }

  // Xử lý thông báo xác thực email và xác thực thành công
  const params = new URLSearchParams(window.location.search);
  const verifySuccess = document.getElementById("verify-success");
  const verifyInfo = document.getElementById("verify-info");
  if (params.get("verified") === "success") {
    if (verifySuccess) {
      verifySuccess.textContent =
        "Xác thực email thành công! Bạn có thể đăng nhập.";
      verifySuccess.style.display = "block";
    } else {
      alert("Xác thực email thành công! Bạn có thể đăng nhập.");
    }
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
