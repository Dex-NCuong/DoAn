// Homepage specific JavaScript
document.addEventListener("DOMContentLoaded", function () {
  console.log("Home JS loaded successfully");

  // Kiểm tra trạng thái tài khoản user
  try {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.status === false) {
        showBannedUserModal();
        return; // Không load các chức năng khác
      }
    }
  } catch (e) {
    console.error("Lỗi kiểm tra trạng thái user:", e);
  }

  // Load featured stories
  loadFeaturedStories();

  // Load hot stories
  loadHotStories();

  // Load new stories
  loadNewStories();

  // Load completed stories
  loadCompletedStories();
});

// Function to load featured stories
async function loadFeaturedStories() {
  const featuredSlider = document.querySelector("#featured-slider");
  if (!featuredSlider) return;

  try {
    const response = await fetch("/api/stories?featured=true");
    const data = await response.json();

    console.log("Featured stories:", data);

    if (data.stories && data.stories.length > 0) {
      let html = "";
      data.stories.forEach((story) => {
        html += `
          <div class="slide">
            <img src="${
              story.coverImage || "/images/default-cover.jpg"
            }" alt="${story.title}">
            <div class="slide-content">
              <h3>${story.title}</h3>
              <p>${story.description.substring(0, 150)}${
          story.description.length > 150 ? "..." : ""
        }</p>
              <a href="/story/${story._id}" class="btn-primary">Đọc ngay</a>
            </div>
          </div>
        `;
      });
      featuredSlider.innerHTML = html;
    } else {
      featuredSlider.innerHTML =
        '<p class="no-data">Không có truyện nổi bật.</p>';
    }
  } catch (error) {
    console.error("Error loading featured stories:", error);
    featuredSlider.innerHTML =
      '<p class="error">Đã xảy ra lỗi khi tải truyện nổi bật.</p>';
  }
}

// Function to load hot stories
async function loadHotStories() {
  const hotStoriesContainer = document.querySelector("#hot-stories");
  if (!hotStoriesContainer) return;

  try {
    const response = await fetch("/api/stories?isHot=true&limit=6");
    const data = await response.json();

    console.log("Hot stories:", data);

    if (data.stories && data.stories.length > 0) {
      let html = "";
      // Only show stories that are explicitly marked as hot
      const hotStories = data.stories.filter((story) => story.isHot === true);

      if (hotStories.length > 0) {
        hotStories.forEach((story) => {
          html += createStoryCard(story);
        });
        hotStoriesContainer.innerHTML = html;
      } else {
        hotStoriesContainer.innerHTML = `
          <div class="no-stories">
            <p>Không có truyện hot.</p>
            <p>Vui lòng quay lại sau!</p>
          </div>
        `;
      }
    } else {
      hotStoriesContainer.innerHTML = `
        <div class="no-stories">
          <p>Không có truyện hot.</p>
          <p>Vui lòng quay lại sau!</p>
        </div>
      `;
    }
  } catch (error) {
    console.error("Error loading hot stories:", error);
    hotStoriesContainer.innerHTML = `
      <div class="error-message">
        <p>Đã xảy ra lỗi khi tải truyện hot.</p>
        <p>Vui lòng thử lại sau!</p>
      </div>
    `;
  }
}

// Function to load new stories
async function loadNewStories() {
  const newStoriesContainer = document.querySelector("#new-stories");
  if (!newStoriesContainer) return;

  try {
    const response = await fetch("/api/stories?isNew=true&limit=6");
    const data = await response.json();

    console.log("New stories:", data);

    if (data.stories && data.stories.length > 0) {
      let html = "";
      data.stories.forEach((story) => {
        html += createStoryCard(story);
      });
      newStoriesContainer.innerHTML = html;
    } else {
      newStoriesContainer.innerHTML = `
        <div class="no-stories">
          <p>Không có truyện mới.</p>
          <p>Vui lòng quay lại sau!</p>
        </div>
      `;
    }
  } catch (error) {
    console.error("Error loading new stories:", error);
    newStoriesContainer.innerHTML = `
      <div class="error-message">
        <p>Đã xảy ra lỗi khi tải truyện mới.</p>
        <p>Vui lòng thử lại sau!</p>
      </div>
    `;
  }
}

// Function to load completed stories
async function loadCompletedStories() {
  const completedStoriesContainer =
    document.querySelector("#completed-stories");
  if (!completedStoriesContainer) return;

  try {
    const response = await fetch("/api/stories?status=completed&limit=6");
    const data = await response.json();

    console.log("Completed stories:", data);

    if (data.stories && data.stories.length > 0) {
      let html = "";
      data.stories.forEach((story) => {
        html += createStoryCard(story);
      });
      completedStoriesContainer.innerHTML = html;
    } else {
      completedStoriesContainer.innerHTML = `
        <div class="no-stories">
          <p>Không có truyện full.</p>
          <p>Vui lòng quay lại sau!</p>
        </div>
      `;
    }
  } catch (error) {
    console.error("Error loading completed stories:", error);
    completedStoriesContainer.innerHTML = `
      <div class="error-message">
        <p>Đã xảy ra lỗi khi tải truyện full.</p>
        <p>Vui lòng thử lại sau!</p>
      </div>
    `;
  }
}

// Helper function to create a story card
function createStoryCard(story) {
  // Format genre badges
  let genreBadges = "";
  if (story.genres && story.genres.length > 0) {
    story.genres.slice(0, 3).forEach((genre) => {
      genreBadges += `<span class="genre-badge">${
        typeof genre === "object" ? genre.name : genre
      }</span>`;
    });
    if (story.genres.length > 3) {
      genreBadges += `<span class="genre-badge">+${
        story.genres.length - 3
      }</span>`;
    }
  }

  // Format chapter info
  const chapterInfo = story.latestChapter
    ? `<div class="chapter-info">
        <span>Chapter ${story.latestChapter.number}: ${story.latestChapter.title}</span>
      </div>`
    : `<div class="chapter-info">
        <span>Chưa có chương</span>
      </div>`;

  // Format time ago
  const timeAgo = getTimeAgo(story.updatedAt || story.createdAt);

  return `
    <div class="story-card">
      <a href="story-detail.html?id=${story._id}">
        <div class="story-cover">
          <img src="${story.coverImage || "/images/default-cover.jpg"}" alt="${
    story.title
  }" onerror="this.src='/images/default-cover.svg'">
          <div class="story-badges">
            ${story.isHot ? '<span class="hot-badge">HOT</span>' : ""}
            ${story.isNew ? '<span class="new-badge">NEW</span>' : ""}
            ${
              story.status === "completed"
                ? '<span class="full-badge">FULL</span>'
                : ""
            }
          </div>
        </div>
        <div class="story-info">
          <h3 class="story-title">${story.title}</h3>
          <div class="story-meta">
            <span><i class="fas fa-user"></i> ${story.author}</span>
            <span><i class="fas fa-eye"></i> ${formatNumber(
              story.views || 0
            )}</span>
            <span><i class="fas fa-clock"></i> ${timeAgo}</span>
          </div>
          <div class="story-genres">
            ${genreBadges}
          </div>
          ${chapterInfo}
        </div>
      </a>
    </div>
  `;
}

// Helper function to format time ago
function getTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) {
    return interval + " năm trước";
  }

  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) {
    return interval + " tháng trước";
  }

  interval = Math.floor(seconds / 86400);
  if (interval >= 1) {
    return interval + " ngày trước";
  }

  interval = Math.floor(seconds / 3600);
  if (interval >= 1) {
    return interval + " giờ trước";
  }

  interval = Math.floor(seconds / 60);
  if (interval >= 1) {
    return interval + " phút trước";
  }

  return Math.floor(seconds) + " giây trước";
}

// Helper function to format numbers (e.g. 1000 -> 1K)
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num;
}

// Thêm hàm hiển thị modal cảnh báo user bị cấm
function showBannedUserModal() {
  // Tạo HTML modal
  const modalHtml = `
    <div id="banned-user-modal" style="position:fixed;z-index:9999;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;">
      <div style="background:#fff;padding:32px 24px;border-radius:8px;max-width:90vw;width:400px;text-align:center;box-shadow:0 2px 16px rgba(0,0,0,0.2);">
        <h2 style="color:#e74c3c;margin-bottom:16px;">Tài khoản của bạn đã bị cấm</h2>
        <p style="margin-bottom:16px;">Vui lòng liên hệ <a id="fanpage-link" href="https://www.facebook.com/TruyenHay123" target="_blank" style="color:#1877f2;text-decoration:underline;font-weight:bold;">Fanpage</a> để được hỗ trợ.</p>
        <button id="banned-ok-btn" style="margin-top:8px;padding:8px 24px;background:#1877f2;color:#fff;border:none;border-radius:4px;font-size:16px;cursor:pointer;">OK</button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHtml);
  // Disable scroll
  document.body.style.overflow = "hidden";
  // Xử lý nút OK
  document.getElementById("banned-ok-btn").onclick = function () {
    // Gọi logout (xoá localStorage, reload về login)
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    document.body.style.overflow = "";
    window.location.href = "/login.html";
  };
  // Xử lý link fanpage (đã có target _blank)
}
