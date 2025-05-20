document.addEventListener("DOMContentLoaded", async function () {
  // Kiểm tra token trước
  const token = localStorage.getItem("auth_token");
  if (!token) {
    showMessage("Vui lòng đăng nhập lại", "error");
    setTimeout(() => {
      window.location.href = "/auth/login.html";
    }, 1500);
    return;
  }

  // Kiểm tra xem có đang ở chế độ sửa chương không
  const editingChapterId = localStorage.getItem("editingChapterId");
  const isEditing = !!editingChapterId;

  // Set page title and button text based on mode
  const pageTitle = document.querySelector(".admin-header-left h1");
  const submitButton = document.querySelector('button[type="submit"]');

  if (pageTitle) {
    pageTitle.textContent = isEditing ? "Sửa Chương" : "Thêm Chương Mới";
  }
  if (submitButton) {
    submitButton.textContent = isEditing ? "Cập nhật chương" : "Thêm chương";
  }

  // Load danh sách truyện vào select
  await loadStories();

  // Xử lý form submit
  const form = document.getElementById("add-chapter-form");
  form.addEventListener("submit", handleSubmit);

  // Xử lý thay đổi loại chương
  const chapterTypeSelect = document.getElementById("new-chapter-type");
  const priceInput = document.getElementById("new-chapter-price");

  chapterTypeSelect.addEventListener("change", function () {
    priceInput.disabled = this.value === "free";
    if (this.value === "free") {
      priceInput.value = "0";
    }
  });

  // Nếu đang sửa chương, load thông tin chương
  if (isEditing) {
    await loadChapterData(editingChapterId);
  }
});

async function loadStories() {
  try {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      showMessage("Vui lòng đăng nhập lại", "error");
      setTimeout(() => {
        window.location.href = "/auth/login.html";
      }, 1500);
      return;
    }

    // Thử kết nối với API
    const response = await fetch("/api/stories", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const stories = data.stories || [];

    if (!Array.isArray(stories)) {
      console.error("Dữ liệu truyện không hợp lệ:", data);
      showMessage("Dữ liệu truyện không hợp lệ", "error");
      return;
    }

    const select = document.getElementById("new-chapter-story");
    // Xóa các option cũ nếu có
    select.innerHTML = '<option value="">-- Chọn truyện --</option>';

    stories.forEach((story) => {
      const option = document.createElement("option");
      option.value = story._id;
      option.textContent = story.title;
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Lỗi khi tải danh sách truyện:", error);
    showMessage(
      "Không thể tải danh sách truyện. Vui lòng thử lại sau!",
      "error"
    );
  }
}

// Hàm load thông tin chương cần sửa
async function loadChapterData(chapterId) {
  try {
    const token = localStorage.getItem("auth_token");
    const response = await fetch(`/api/chapters/${chapterId}/admin`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Không thể tải thông tin chương");
    }

    const data = await response.json();
    const chapter = data.chapter;

    if (!chapter) {
      throw new Error("Không tìm thấy thông tin chương");
    }

    console.log("Loaded chapter data:", chapter);

    // Đợi cho select story được load xong và có options
    await waitForElement("#new-chapter-story option");

    // Điền thông tin vào form
    const storySelect = document.getElementById("new-chapter-story");
    if (chapter.story && chapter.story._id) {
      storySelect.value = chapter.story._id;
    }

    document.getElementById("new-chapter-title").value = chapter.title || "";
    document.getElementById("new-chapter-number").value = chapter.number || "";
    document.getElementById("new-chapter-type").value = chapter.isVIP
      ? "vip"
      : "free";
    document.getElementById("new-chapter-price").value =
      chapter.coinPrice || "0";
    document.getElementById("new-chapter-price").disabled = !chapter.isVIP;

    // Đặt nội dung vào Summernote
    $("#new-chapter-content").summernote("code", chapter.content || "");
  } catch (error) {
    console.error("Lỗi khi tải thông tin chương:", error);
    showMessage("Không thể tải thông tin chương: " + error.message, "error");
  }
}

// Hàm đợi cho element được load
function waitForElement(selector) {
  return new Promise((resolve) => {
    if (document.querySelector(selector)) {
      return resolve();
    }

    const observer = new MutationObserver((mutations) => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        resolve();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
}

// Hàm đợi cho CKEditor được khởi tạo
function waitForEditor() {
  return new Promise((resolve) => {
    if (window.editor) {
      return resolve();
    }

    const checkEditor = setInterval(() => {
      if (window.editor) {
        clearInterval(checkEditor);
        resolve();
      }
    }, 100);

    // Timeout sau 5 giây nếu không tìm thấy editor
    setTimeout(() => {
      clearInterval(checkEditor);
      resolve();
    }, 5000);
  });
}

// Hàm xử lý submit form
async function handleSubmit(event) {
  event.preventDefault();

  try {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      showMessage("Vui lòng đăng nhập lại", "error");
      setTimeout(() => {
        window.location.href = "/auth/login.html";
      }, 1500);
      return;
    }

    // Validate required fields
    const storyId = document.getElementById("new-chapter-story").value;
    const title = document.getElementById("new-chapter-title").value.trim();
    const content = $("#new-chapter-content").summernote("code").trim();
    const numberStr = document
      .getElementById("new-chapter-number")
      .value.trim();
    const number = parseInt(numberStr);
    const isVIP = document.getElementById("new-chapter-type").value === "vip";
    const coinPriceStr = document
      .getElementById("new-chapter-price")
      .value.trim();
    const coinPrice = isVIP ? parseInt(coinPriceStr) || 0 : 0;

    // Validate inputs
    if (!storyId) {
      showMessage("Vui lòng chọn truyện", "error");
      return;
    }

    if (!title) {
      showMessage("Vui lòng nhập tiêu đề chương", "error");
      return;
    }

    if (!content) {
      showMessage("Vui lòng nhập nội dung chương", "error");
      return;
    }

    if (!numberStr) {
      showMessage("Vui lòng nhập số chương", "error");
      return;
    }

    if (isNaN(number) || number <= 0) {
      showMessage("Số chương không hợp lệ", "error");
      return;
    }

    if (isVIP && coinPrice < 0) {
      showMessage("Giá xu không hợp lệ", "error");
      return;
    }

    const editingChapterId = localStorage.getItem("editingChapterId");
    const isEditing = !!editingChapterId;

    const formData = {
      title: title,
      content: content,
      number: number,
      isVIP: isVIP,
      coinPrice: coinPrice,
      status: isEditing ? "approved" : "pending",
    };

    // Nếu đang thêm mới (không phải edit), thêm storyId vào formData
    if (!isEditing) {
      formData.storyId = storyId;
    }

    // Xác định URL và method dựa trên chế độ sửa/thêm
    const url = isEditing
      ? `/api/chapters/${editingChapterId}/admin`
      : `/api/stories/${storyId}/chapters`;
    const method = isEditing ? "PUT" : "POST";

    console.log("Sending request:", {
      url,
      method,
      formData: JSON.stringify(formData),
    });

    const response = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(formData),
    });

    const responseText = await response.text();
    console.log("Server response text:", responseText);

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user");
        showMessage(
          "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại",
          "error"
        );
        setTimeout(() => {
          window.location.href = "/auth/login.html";
        }, 1500);
        return;
      }

      let errorMessage;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.error;
      } catch (e) {
        console.error("Error parsing error response:", e);
        errorMessage = responseText;
      }

      throw new Error(
        errorMessage ||
          (isEditing
            ? "Không thể cập nhật chương. Vui lòng thử lại!"
            : "Không thể thêm chương. Vui lòng thử lại!")
      );
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error("Error parsing success response:", e);
      result = { message: "Thao tác thành công" };
    }

    showMessage(
      isEditing ? "Cập nhật chương thành công!" : "Thêm chương thành công!",
      "success"
    );

    // Xóa thông tin sửa chương nếu có
    if (isEditing) {
      localStorage.removeItem("editingChapterId");
      localStorage.removeItem("editingStoryId");
    }

    // Clear form
    document.getElementById("add-chapter-form").reset();
    document.getElementById("new-chapter-content").value = "";

    setTimeout(() => {
      window.location.href = "chapters.html";
    }, 1000);
  } catch (error) {
    console.error("Lỗi khi xử lý chương:", error);
    showMessage(error.message || "Có lỗi xảy ra. Vui lòng thử lại!", "error");
  }
}

function showMessage(message, type = "info") {
  // Implement your message showing logic here
  alert(message);
}
