// DOM Elements
const usernameElement = document.getElementById("username");
const userCoinsElement = document.getElementById("userCoins");
const followedListElement = document.getElementById("followed-list");
const loadingElement = document.getElementById("loading");
const noStoriesElement = document.getElementById("no-stories");
const logoutBtn = document.getElementById("logout-btn");

// Load stories data on page load
document.addEventListener("DOMContentLoaded", () => {
  // Use simpler authentication check
  if (!localStorage.getItem("auth_token")) {
    window.location.href = "login.html?redirect=/user-followed.html";
    return;
  }

  // Load user from localStorage
  const userJson = localStorage.getItem("user");
  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      // Update UI with user data
      usernameElement.textContent = user.username || "Người dùng";
      userCoinsElement.textContent = user.coins || 0;

      // Show loading state
      loadingElement.style.display = "block";
      followedListElement.style.display = "none";
      noStoriesElement.style.display = "none";

      // Try to load followed stories from server
      loadFollowedStories();
    } catch (error) {
      console.error("Error parsing user data:", error);
      showError("Đã xảy ra lỗi khi tải thông tin người dùng.");
    }
  }

  // Logout button
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
  }
});

// Load followed stories
async function loadFollowedStories() {
  try {
    // Fetch followed stories from server
    const response = await fetch("/api/users/followed-stories", {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("auth_token"),
      },
    });

    const data = await response.json();

    // Hide loading
    loadingElement.style.display = "none";

    if (data.success && data.stories && data.stories.length > 0) {
      // Render followed stories
      renderFollowedStories(data.stories);
      followedListElement.style.display = "flex";
    } else {
      // Show no stories message
      noStoriesElement.style.display = "block";
    }
  } catch (error) {
    console.error("Error loading followed stories:", error);
    loadingElement.style.display = "none";
    showError("Đã xảy ra lỗi khi tải danh sách truyện theo dõi.");
  }
}

// Render followed stories
function renderFollowedStories(stories) {
  followedListElement.innerHTML = "";

  stories.forEach((story) => {
    const storyElement = document.createElement("div");
    storyElement.className = "story-card";

    const coverImage =
      story.coverImage || story.cover || "images/default-cover.jpg";

    storyElement.innerHTML = `
      <div class="story-thumbnail">
        <img src="${coverImage}" alt="${story.title}">
      </div>
      <div class="story-info">
        <h2 class="story-title">${story.title}</h2>
        <div class="story-meta">
          <span class="story-author">Tác giả: ${
            story.author || "Không rõ"
          }</span>
          <span class="story-follow-date">Theo dõi: ${formatDate(
            new Date(story.followedAt || Date.now())
          )}</span>
        </div>
        <div class="story-actions">
          <button class="btn btn-unfollow" data-story-id="${
            story.storyId || story._id
          }">
            <i class="fas fa-times"></i> Bỏ theo dõi
          </button>
          <a href="story-detail.html?id=${
            story.storyId || story._id
          }" class="btn btn-primary">
            <i class="fas fa-book-open"></i> Đọc
          </a>
        </div>
      </div>
    `;

    followedListElement.appendChild(storyElement);
  });

  // Add event listeners for unfollow buttons
  document.querySelectorAll(".btn-unfollow").forEach((button) => {
    button.addEventListener("click", handleUnfollow);
  });
}

// Hàm định dạng thời gian (ví dụ: "3 giờ trước")
function formatTimeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  // Các ngưỡng thời gian
  const minute = 60;
  const hour = minute * 60;
  const day = hour * 24;
  const week = day * 7;
  const month = day * 30;
  const year = day * 365;

  // Xác định khoảng thời gian
  if (diffInSeconds < minute) {
    return "Vừa xong";
  } else if (diffInSeconds < hour) {
    const minutes = Math.floor(diffInSeconds / minute);
    return `${minutes} phút trước`;
  } else if (diffInSeconds < day) {
    const hours = Math.floor(diffInSeconds / hour);
    return `${hours} giờ trước`;
  } else if (diffInSeconds < week) {
    const days = Math.floor(diffInSeconds / day);
    return `${days} ngày trước`;
  } else if (diffInSeconds < month) {
    const weeks = Math.floor(diffInSeconds / week);
    return `${weeks} tuần trước`;
  } else if (diffInSeconds < year) {
    const months = Math.floor(diffInSeconds / month);
    return `${months} tháng trước`;
  } else {
    const years = Math.floor(diffInSeconds / year);
    return `${years} năm trước`;
  }
}

// Hàm định dạng ngày (ví dụ: "15/05/2023")
function formatDate(date) {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

// Handle unfollow
async function handleUnfollow(e) {
  try {
    const storyId = e.currentTarget.getAttribute("data-story-id");
    if (!storyId) {
      console.error("Không tìm thấy ID truyện");
      return;
    }

    if (!confirm("Bạn có chắc muốn bỏ theo dõi truyện này?")) {
      return;
    }

    // Hiển thị trạng thái loading trên nút
    const unfollowBtn = e.currentTarget;
    const originalBtnText = unfollowBtn.innerHTML;
    unfollowBtn.disabled = true;
    unfollowBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';

    const response = await fetch(`/api/stories/${storyId}/unfollow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("auth_token"),
      },
    });

    if (!response.ok) {
      throw new Error(`Lỗi HTTP: ${response.status}`);
    }

    const data = await response.json();

    if (data.success) {
      // An toàn hơn: tìm story card từ nút bỏ theo dõi
      const storyCard = unfollowBtn.closest(".story-card");

      if (storyCard) {
        // Hiệu ứng fade out trước khi xóa
        storyCard.style.opacity = "0";
        storyCard.style.transition = "opacity 0.5s";

        // Xóa phần tử sau khi hiệu ứng hoàn tất
        setTimeout(() => {
          storyCard.remove();

          // Kiểm tra nếu không còn truyện nào
          if (followedListElement.children.length === 0) {
            followedListElement.style.display = "none";
            noStoriesElement.style.display = "block";
          }
        }, 500);
      } else {
        // Nếu không tìm thấy card, reload lại toàn bộ danh sách
        console.warn("Không tìm thấy card truyện, đang tải lại danh sách");
        loadFollowedStories();
      }

      // Hiện thông báo
      showNotification("Đã bỏ theo dõi truyện thành công");
    } else {
      // Khôi phục nút về trạng thái ban đầu
      unfollowBtn.disabled = false;
      unfollowBtn.innerHTML = originalBtnText;
      alert(data.message || "Đã xảy ra lỗi khi bỏ theo dõi truyện.");
    }
  } catch (error) {
    console.error("Error unfollowing story:", error);
    alert("Đã xảy ra lỗi khi bỏ theo dõi truyện: " + error.message);

    // Tải lại danh sách trong trường hợp lỗi
    loadFollowedStories();
  }
}

// Thêm hàm hiển thị thông báo
function showNotification(message, duration = 3000) {
  // Tạo thông báo
  const notification = document.createElement("div");
  notification.textContent = message;
  notification.style.position = "fixed";
  notification.style.bottom = "20px";
  notification.style.right = "20px";
  notification.style.backgroundColor = "#4CAF50";
  notification.style.color = "white";
  notification.style.padding = "12px 20px";
  notification.style.borderRadius = "4px";
  notification.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";
  notification.style.zIndex = "10000";
  notification.style.opacity = "0";
  notification.style.transition = "opacity 0.3s ease-in-out";

  // Thêm vào body
  document.body.appendChild(notification);

  // Hiện thông báo
  setTimeout(() => {
    notification.style.opacity = "1";
  }, 10);

  // Ẩn và xóa thông báo sau duration
  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, duration);
}

// Show error message
function showError(message) {
  loadingElement.style.display = "none";
  followedListElement.style.display = "none";

  // Create an error element if it doesn't exist
  let errorElement = document.querySelector(".error-message");

  if (!errorElement) {
    errorElement = document.createElement("div");
    errorElement.className = "error-message";

    // Insert after loading element
    loadingElement.parentNode.insertBefore(
      errorElement,
      loadingElement.nextSibling
    );
  }

  errorElement.innerHTML = `
    <i class="fas fa-exclamation-circle"></i>
    <p>${message}</p>
    <button id="retry-btn" class="btn btn-primary">Thử lại</button>
  `;

  errorElement.style.display = "block";

  // Add retry button event listener
  const retryBtn = document.getElementById("retry-btn");
  if (retryBtn) {
    retryBtn.addEventListener("click", () => {
      errorElement.style.display = "none";
      loadFollowedStories();
    });
  }
}

// Handle logout
function logout() {
  try {
    // Xóa thông tin đăng nhập từ localStorage
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");

    // Chuyển hướng về trang chủ
    window.location.href = "/index.html";
  } catch (error) {
    console.error("Error logging out:", error);
    alert("Đã xảy ra lỗi khi đăng xuất.");
  }
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  // Load followed stories
  loadFollowedStories();

  // Logout button
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
  }
});
