// Story Detail Page JavaScript

// Create a namespace for story detail functionality
const StoryDetail = {
  page: 1,
  chaptersPerPage: 10,
  allChapters: [],
};

// Thêm script view-tracker.js vào head
const loadViewTracker = new Promise((resolve, reject) => {
  const script = document.createElement("script");
  script.src = "js/view-tracker.js";
  script.onload = resolve;
  script.onerror = reject;
  document.head.appendChild(script);
});

// Hàm chính để khởi tạo trang
async function initializePage() {
  // Hiển thị container ngay từ đầu
  document.getElementById("story-info-container").style.display = "block";

  try {
    // Hiển thị loading
    showLoading(true);

    // Đợi viewTracker được tải
    await loadViewTracker;

    // Lấy storyId từ URL
    const urlParams = new URLSearchParams(window.location.search);
    const storyId = urlParams.get("id");

    if (!storyId) {
      showError("Không tìm thấy ID truyện");
      return;
    }

    // Tăng lượt xem ngay lập tức
    window.viewTracker.initStory(storyId);

    // Load thông tin truyện
    const response = await fetch(`/api/stories/${storyId}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Lỗi khi tải thông tin truyện");
    }

    if (!data.data || !data.data.story) {
      throw new Error("Không tìm thấy thông tin truyện");
    }

    const story = data.data.story;
    console.log("Story data:", story); // Log story data
    allChapters = data.data.chapters || [];
    console.log("Chapters data:", allChapters); // Thêm log này để kiểm tra dữ liệu chương

    // Cập nhật thông tin truyện lên giao diện
    document.title = `${story.title} - Web Đọc Truyện`;
    document.getElementById("story-title").textContent = story.title;
    document.getElementById("story-author").textContent = story.author;
    document.getElementById("story-views").textContent = story.views || 0;
    document.getElementById("story-description").textContent =
      story.description;

    const coverImg = document.getElementById("story-cover");
    if (coverImg) {
      coverImg.src = story.coverImage || "/images/default-cover.jpg";
      coverImg.alt = story.title;
    }

    // Cập nhật trạng thái
    const statusBadge = document.getElementById("story-status");
    const statusText = document.getElementById("story-status-text");
    if (statusBadge && statusText) {
      const isCompleted = story.status === "completed";
      statusBadge.textContent = isCompleted ? "Hoàn thành" : "Đang ra";
      statusBadge.className = `story-status ${story.status}`;
      statusText.textContent = isCompleted ? "Hoàn thành" : "Đang ra";
      statusText.className = story.status;
    }

    // Cập nhật thể loại
    const genresContainer = document.getElementById("story-genres");
    if (genresContainer && Array.isArray(story.genres)) {
      genresContainer.innerHTML = story.genres
        .map((genre) => `<span class="genre-badge">${genre.name}</span>`)
        .join("");
    }

    // Cập nhật nút Theo dõi
    const isFollowing = await checkFollowStatus(storyId);
    updateFollowButton(storyId, isFollowing);

    // Cập nhật hiển thị đánh giá
    const ratingAverage = story.rating?.average || 0;
    const ratingCount = story.rating?.count || 0;
    updateRatingDisplay(ratingAverage, ratingCount, currentUserRating);

    // Hiển thị chương mới nhất
    displayLatestChapters(data.data.chapters);

    // Hiển thị danh sách chương
    displayChapters(1);

    // Khởi tạo các thành phần khác
    initStartReadingButton(storyId);
    initShowMoreDescription();
    initRatingSystem();

    // Load author's other stories
    console.log("Loading author stories for author:", story.author);
    await loadAuthorStories(story.author, storyId);

    // Load top stories
    await loadTopStories("day");

    // Load genres
    await loadGenresGrid();

    // Ẩn loading
    showLoading(false);
  } catch (error) {
    console.error("Lỗi khi tải thông tin truyện:", error);
    showError(error.message || "Đã xảy ra lỗi khi tải thông tin truyện");
    showLoading(false);
  }
}

// Khởi tạo trang khi DOM đã tải xong
document.addEventListener("DOMContentLoaded", initializePage);

// Biến toàn cục để lưu trữ danh sách chương và trạng thái phân trang
let allChapters = [];
const CHAPTERS_PER_PAGE = 10;

// Định nghĩa các mô tả đánh giá tương ứng với số sao
const ratingDescriptions = {
  1: "Không còn gì để nói",
  2: "Có chắc là truyện ?",
  3: "Quá tệ",
  4: "Tệ",
  5: "Tạm",
  6: "Cũng được",
  7: "Khá",
  8: "Quá được",
  9: "Hay",
  10: "Tuyệt đỉnh",
};

let currentUserRating = null; // Lưu đánh giá của user hiện tại cho truyện này
let hasUserRated = false; // Lưu trạng thái user đã đánh giá truyện này chưa

// Thêm CSS để disable con trỏ khi đã đánh giá
const style = document.createElement("style");
style.textContent = `
  .star-rating .stars.disabled {
    cursor: not-allowed;
  }
  .star-rating .stars.disabled .star:hover {
    color: #ccc; /* Ngăn đổi màu khi hover nếu đã disable */
  }
`;
document.head.appendChild(style);

// Thêm hàm tăng lượt xem
async function incrementViews(storyId) {
  if (!storyId) {
    console.error("Story ID is missing");
    return;
  }

  try {
    // Log để debug
    console.log("Incrementing views for story:", storyId);

    const response = await fetch(`/api/stories/${storyId}/views`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.success && data.views) {
      const viewsElement = document.getElementById("story-views");
      if (viewsElement) {
        viewsElement.textContent = formatNumber(data.views);
      }
    }
  } catch (error) {
    console.error("Error incrementing views:", error);
    // Không hiển thị lỗi cho người dùng vì đây không phải lỗi quan trọng
  }
}

// Thêm hàm showLoading dùng để hiển thị hoặc ẩn phần tử loading
function showLoading(show) {
  const loadingElement = document.getElementById("loading");
  const storyContainer = document.getElementById("story-info-container");

  if (loadingElement) {
    loadingElement.style.display = show ? "block" : "none";
  }

  if (storyContainer) {
    storyContainer.style.display = show ? "none" : "block";
  }
}

// Thêm hàm kiểm tra trạng thái theo dõi
async function checkFollowStatus(storyId) {
  try {
    const token = localStorage.getItem("auth_token");
    if (!token) return false;

    const response = await fetch(`/api/stories/${storyId}/check-follow`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error("Error checking follow status:", response.statusText);
      return false;
    }

    const data = await response.json();
    return data.following || false;
  } catch (error) {
    console.error("Error checking follow status:", error);
    return false;
  }
}

// Thêm hàm displayLatestChapters
function displayLatestChapters(chapters) {
  const latestChaptersList = document.getElementById("latest-chapters-list");
  if (!latestChaptersList) return;

  const sortedChapters = [...chapters].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  const latestChapters = sortedChapters.slice(0, 4);

  latestChaptersList.innerHTML = latestChapters
    .map(
      (chapter) => `
    <div class="latest-chapter-item">
      <a href="chapter.html?id=${chapter._id}">
        <div class="latest-chapter-info">
          <div class="latest-chapter-title">
            Chương ${chapter.number}: ${chapter.title}
            ${
              chapter.isLocked && !chapter.isPurchased
                ? '<i class="fas fa-lock chapter-lock-icon" title="Chương bị khóa" style="color:#d9534f;margin-left:8px;"></i>'
                : ""
            }
          </div>
          <div class="latest-chapter-time">${formatTimeAgo(
            new Date(chapter.createdAt)
          )}</div>
        </div>
      </a>
    </div>
  `
    )
    .join("");
}

// Sửa hàm fetchCurrentUserRating để đảm bảo nó luôn được gọi trước
async function fetchCurrentUserRating(storyId) {
  const token = localStorage.getItem("auth_token");
  hasUserRated = false; // Reset trước khi fetch
  currentUserRating = null;

  if (!token) {
    return; // Không cần gọi API nếu chưa đăng nhập
  }

  try {
    const response = await fetch(`/api/stories/${storyId}/my-rating`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      console.error("Error fetching user rating status:", response.statusText);
      return;
    }
    const data = await response.json();
    if (data.success) {
      hasUserRated = data.rated;
      currentUserRating = data.rating; // Sẽ là null nếu chưa đánh giá
      console.log(
        "Fetched user rating status:",
        hasUserRated,
        "Rating:",
        currentUserRating
      );
    } else {
      console.log("API success false fetching user rating");
    }
  } catch (error) {
    console.error("Error fetching user rating status:", error);
  }
}

// Thêm hàm updateFollowButton để thay thế initFollowButton
function updateFollowButton(storyId, isFollowing) {
  const followBtn = document.getElementById("follow-btn");
  if (!followBtn) return;

  // Kiểm tra xem người dùng đã đăng nhập chưa
  const token = localStorage.getItem("auth_token");
  const isLoggedIn = !!token;

  if (isLoggedIn) {
    followBtn.innerHTML = isFollowing
      ? '<i class="fas fa-bookmark"></i> Đã theo dõi'
      : '<i class="far fa-bookmark"></i> Theo dõi';
    followBtn.onclick = () => toggleFollow(storyId);
  } else {
    followBtn.innerHTML = '<i class="far fa-bookmark"></i> Theo dõi';
    followBtn.onclick = () => {
      alert("Bạn cần đăng nhập để theo dõi truyện!");
      window.location.href = "login.html";
    };
  }
}

// Thêm hàm initStartReadingButton
function initStartReadingButton(storyId) {
  const startReadingBtn = document.getElementById("start-reading-btn");
  if (!startReadingBtn) return;

  startReadingBtn.addEventListener("click", async function () {
    if (!storyId) return;

    try {
      // Lấy danh sách chương của truyện
      const response = await fetch(`/api/stories/${storyId}/chapters`);
      if (!response.ok) {
        throw new Error("Failed to fetch chapters");
      }

      const data = await response.json();
      const chapters = data.chapters || data; // Xử lý cả 2 trường hợp response format

      if (chapters && chapters.length > 0) {
        // Chuyển đến chương đầu tiên với đúng tham số URL
        window.location.href = `/chapter.html?id=${chapters[0]._id}`;
      } else {
        alert("Truyện này chưa có chương nào!");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Có lỗi xảy ra khi tải chương truyện");
    }
  });
}

// Sửa lại hàm submitRating để xử lý response đúng cách
async function submitRating(rating) {
  try {
    const storyId = getStoryIdFromUrl();
    if (!storyId) return Promise.reject("No story ID");

    const token = localStorage.getItem("auth_token");
    if (!token) {
      alert("Bạn cần đăng nhập để đánh giá!");
      return Promise.reject("Not logged in");
    }

    // Gửi đánh giá lên server
    const response = await fetch(`/api/stories/${storyId}/rate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ rating }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(
        data.message || `Có lỗi xảy ra khi gửi đánh giá (${response.status})`
      );
      return Promise.reject(`HTTP error! status: ${response.status}`);
    }

    // Xử lý thành công
    if (data.success) {
      hasUserRated = true;
      currentUserRating = rating;

      // Log the API response data for debugging
      console.log("API Response after rating:", data);

      // Kiểm tra xem API có trả về averageRating và ratingCount không
      if (
        typeof data.averageRating === "number" &&
        typeof data.ratingCount === "number"
      ) {
        console.log("Updating UI with new rating:", {
          average: data.averageRating,
          count: data.ratingCount,
        });

        // Cập nhật UI với dữ liệu mới từ response
        updateRatingDisplay(
          data.averageRating, // Lấy trực tiếp từ data
          data.ratingCount, // Lấy trực tiếp từ data
          rating
        );

        // Vô hiệu hóa ngôi sao
        const starsContainer = document.querySelector(".star-rating .stars");
        if (starsContainer) {
          starsContainer.classList.add("disabled");
          starsContainer
            .querySelectorAll(".star")
            .forEach((star) => (star.style.pointerEvents = "none"));
        }

        // Hiển thị thông báo thành công
        alert("Đánh giá thành công!");
      } else {
        console.warn(
          "API did not return expected averageRating/ratingCount after successful submission."
        );
        // Vẫn hiển thị alert thành công nhưng cảnh báo lỗi cập nhật UI
        alert("Đánh giá thành công (có lỗi khi cập nhật giao diện)!");
      }

      return Promise.resolve(data);
    } else {
      alert(data.message || "Có lỗi xảy ra khi đánh giá.");
      return Promise.reject("API returned success: false");
    }
  } catch (error) {
    console.error("Error submitting rating:", error);
    return Promise.reject(error);
  }
}

// Sửa hàm updateRatingDisplay để cập nhật đúng các element HTML
function updateRatingDisplay(averageRating, count, userSpecificRating) {
  // Tìm các span theo ID
  const ratingValueElement = document.getElementById("rating-value");
  const ratingCountElement = document.getElementById("rating-count");

  // Kiểm tra xem các element có tồn tại không
  if (ratingValueElement && ratingCountElement) {
    // Đảm bảo hiển thị số nguyên cho count và một chữ số thập phân cho average
    const displayCount = Math.max(0, Math.floor(count));
    const displayAverage = Math.max(0, Number(averageRating) || 0).toFixed(1);

    // Cập nhật text hiển thị cho từng span
    ratingValueElement.textContent = displayAverage;
    ratingCountElement.textContent = displayCount;

    // Log để debug
    console.log(
      `Updating rating display - Average: ${displayAverage}, Count: ${displayCount}, User Rating: ${userSpecificRating}`
    );
  } else {
    console.error("Rating value or count element not found in HTML!");
  }

  // Cập nhật hiển thị sao (giữ nguyên logic này)
  const stars = document.querySelectorAll(".star-rating .stars .star");
  if (stars.length > 0) {
    stars.forEach((star) => {
      star.classList.remove("hover", "filled");

      const value = parseInt(star.getAttribute("data-value"));
      if (userSpecificRating && value <= userSpecificRating) {
        star.classList.add("filled");
      }
    });
  }

  // Cập nhật trạng thái disabled (giữ nguyên logic này)
  const starsContainer = document.querySelector(".star-rating .stars");
  if (starsContainer) {
    const token = localStorage.getItem("auth_token");
    const isLoggedIn = !!token;

    if (!isLoggedIn || userSpecificRating) {
      starsContainer.classList.add("disabled");
      stars.forEach((star) => (star.style.pointerEvents = "none"));
    } else {
      starsContainer.classList.remove("disabled");
      stars.forEach((star) => (star.style.pointerEvents = "auto"));
    }
  }
}

// Hàm lấy ID truyện từ URL
function getStoryIdFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("id");
}

// Thêm hàm tạo hộp thoại xác nhận tùy chỉnh
function showCustomConfirm(message, onConfirm, onCancel) {
  // Tạo overlay để làm mờ nền
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
  overlay.style.zIndex = "9998";
  overlay.style.display = "flex";
  overlay.style.justifyContent = "center";
  overlay.style.alignItems = "center";

  // Tạo hộp thoại
  const dialog = document.createElement("div");
  dialog.style.background = "white";
  dialog.style.padding = "20px";
  dialog.style.borderRadius = "5px";
  dialog.style.maxWidth = "400px";
  dialog.style.width = "100%";
  dialog.style.boxShadow = "0 3px 6px rgba(0, 0, 0, 0.16)";
  dialog.style.zIndex = "9999";
  dialog.style.display = "flex";
  dialog.style.flexDirection = "column";
  dialog.style.alignItems = "center";
  dialog.style.gap = "15px";

  // Tạo nội dung
  const content = document.createElement("div");
  content.textContent = message;
  content.style.textAlign = "center";
  content.style.marginBottom = "15px";

  // Tạo vùng chứa nút
  const buttons = document.createElement("div");
  buttons.style.display = "flex";
  buttons.style.gap = "10px";

  // Tạo nút Tiếp tục
  const confirmButton = document.createElement("button");
  confirmButton.textContent = "Tiếp tục";
  confirmButton.style.padding = "8px 16px";
  confirmButton.style.backgroundColor = "#007bff";
  confirmButton.style.color = "white";
  confirmButton.style.border = "none";
  confirmButton.style.borderRadius = "4px";
  confirmButton.style.cursor = "pointer";

  // Tạo nút Thoát
  const cancelButton = document.createElement("button");
  cancelButton.textContent = "Thoát";
  cancelButton.style.padding = "8px 16px";
  cancelButton.style.backgroundColor = "#e9e9e9";
  cancelButton.style.color = "black";
  cancelButton.style.border = "none";
  cancelButton.style.borderRadius = "4px";
  cancelButton.style.cursor = "pointer";

  // Xử lý sự kiện cho nút Tiếp tục
  confirmButton.addEventListener("click", function () {
    document.body.removeChild(overlay);
    if (typeof onConfirm === "function") {
      onConfirm();
    }
  });

  // Xử lý sự kiện cho nút Thoát
  cancelButton.addEventListener("click", function () {
    document.body.removeChild(overlay);
    if (typeof onCancel === "function") {
      onCancel();
    }
  });

  // Ghép các phần lại với nhau
  buttons.appendChild(confirmButton);
  buttons.appendChild(cancelButton);
  dialog.appendChild(content);
  dialog.appendChild(buttons);
  overlay.appendChild(dialog);

  // Thêm vào body
  document.body.appendChild(overlay);
}

// Toggle follow status
async function toggleFollow(storyId) {
  try {
    // Kiểm tra đăng nhập
    const token = localStorage.getItem("auth_token");
    if (!token) {
      showCustomConfirm(
        "Bạn cần đăng nhập để theo dõi truyện!",
        function () {
          window.location.href =
            "login.html?redirect=" + encodeURIComponent(window.location.href);
        },
        function () {
          // Người dùng hủy
        }
      );
      return;
    }

    // Kiểm tra nếu đã theo dõi (dựa trên trạng thái nút)
    const followBtn = document.getElementById("follow-btn");
    const isCurrentlyFollowing = followBtn.innerHTML.includes("Đã theo dõi");

    if (isCurrentlyFollowing) {
      showCustomConfirm(
        "Truyện này đã được theo dõi. Bạn muốn bỏ theo dõi?",
        async function () {
          // Tiếp tục quá trình bỏ theo dõi
          await processFollowUnfollow(storyId);
        },
        function () {
          // Người dùng hủy
        }
      );
    } else {
      // Chưa theo dõi, tiếp tục quá trình theo dõi
      await processFollowUnfollow(storyId);
    }
  } catch (error) {
    console.error("Error toggling follow:", error);
    showError("Đã xảy ra lỗi khi thay đổi trạng thái theo dõi");
  }
}

// Hàm xử lý theo dõi/bỏ theo dõi
async function processFollowUnfollow(storyId) {
  try {
    // Hiển thị loading
    const followBtn = document.getElementById("follow-btn");
    const originalHTML = followBtn.innerHTML;
    followBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
    followBtn.disabled = true;

    // Tạo header chuẩn
    const headers = {
      "Content-Type": "application/json",
    };

    // Thêm token vào header
    const token = localStorage.getItem("auth_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Kiểm tra trạng thái hiện tại từ nút
    const isCurrentlyFollowing = originalHTML.includes("Đã theo dõi");

    // Tìm 3 chương mới nhất để gửi kèm khi theo dõi
    const latestChapters = [];
    if (allChapters && allChapters.length > 0) {
      // Sắp xếp theo thời gian giảm dần
      const sortedChapters = [...allChapters].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      // Lấy tối đa 3 chương mới nhất
      const chaptersToSend = sortedChapters.slice(0, 3).map((chapter) => ({
        _id: chapter._id,
        number: chapter.number,
        title: chapter.title,
        createdAt: chapter.createdAt,
      }));

      latestChapters.push(...chaptersToSend);
    }

    // Lấy thông tin truyện hiện tại
    const storyTitle =
      document.getElementById("story-title")?.textContent || "";
    const storyAuthor =
      document.getElementById("story-author")?.textContent || "";
    const storyImage = document.getElementById("story-cover")?.src || "";
    const statusEl = document.getElementById("story-status");
    const status = statusEl
      ? statusEl.className.includes("completed")
        ? "completed"
        : "ongoing"
      : "";

    // Xác định endpoint và phương thức dựa trên trạng thái hiện tại
    const endpoint = isCurrentlyFollowing
      ? `/api/stories/${storyId}/unfollow`
      : `/api/stories/${storyId}/follow`;

    // Gửi API theo dõi/hủy theo dõi
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        storyInfo: {
          title: storyTitle,
          author: storyAuthor,
          coverImage: storyImage,
          status: status,
          latestChapters,
        },
      }),
    });

    // Reset button
    followBtn.disabled = false;

    if (!response.ok) {
      followBtn.innerHTML = originalHTML;
      if (response.status === 404) {
        showError("Lỗi: API không tồn tại");
      } else {
        showError("Lỗi khi thay đổi trạng thái theo dõi: " + response.status);
      }
      return;
    }

    const data = await response.json();

    if (data.success) {
      // Cập nhật trạng thái nút dựa trên phản hồi từ API
      if (isCurrentlyFollowing) {
        // Đã bỏ theo dõi
        followBtn.innerHTML = '<i class="far fa-bookmark"></i> Theo dõi';
        showNotification("Đã xóa truyện khỏi danh sách theo dõi");
      } else {
        // Đã theo dõi
        followBtn.innerHTML = '<i class="fas fa-bookmark"></i> Đã theo dõi';
        showNotification("Đã thêm truyện vào danh sách theo dõi");
      }
    } else {
      followBtn.innerHTML = originalHTML;
      showError(data.message || "Không thể thay đổi trạng thái theo dõi");
    }
  } catch (error) {
    const followBtn = document.getElementById("follow-btn");
    followBtn.innerHTML = '<i class="far fa-bookmark"></i> Theo dõi';
    followBtn.disabled = false;
    console.error("Error toggling follow:", error);
    showError("Đã xảy ra lỗi khi thay đổi trạng thái theo dõi");
  }
}

// Thêm hàm showNotification để hiển thị thông báo nhỏ
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

// Helper function to format numbers
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Helper function to show error message
function showError(message) {
  const loading = document.getElementById("loading");
  loading.textContent = message;
  loading.style.color = "red";
}

// Xử lý nút xem thêm cho phần mô tả - viết lại hoàn toàn
function initShowMoreDescription() {
  const description = document.getElementById("story-description");
  const showMoreBtn = document.getElementById("show-more-btn");

  // Kiểm tra xem các phần tử có tồn tại không
  if (!description || !showMoreBtn) {
    console.error("Missing description or show more button elements");
    return;
  }

  console.log("Initializing show more description functionality");

  // Đảm bảo description có class collapsed ban đầu
  description.classList.add("collapsed");
  showMoreBtn.textContent = "Xem thêm";

  // Xóa tất cả event listener cũ bằng cách clone và thay thế button
  const newBtn = showMoreBtn.cloneNode(true);
  showMoreBtn.parentNode.replaceChild(newBtn, showMoreBtn);

  // Thêm event listener mới
  newBtn.addEventListener("click", function () {
    console.log("Show more button clicked");

    if (description.classList.contains("collapsed")) {
      // Mở rộng mô tả
      description.classList.remove("collapsed");
      this.textContent = "Thu gọn";
      console.log("Description expanded");
    } else {
      // Thu gọn mô tả
      description.classList.add("collapsed");
      this.textContent = "Xem thêm";
      console.log("Description collapsed");
    }
  });
}

// Helper function to format time ago
function formatTimeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInMonths = Math.floor(diffInDays / 30);

  if (diffInMonths > 0) {
    return `${diffInMonths} tháng trước`;
  } else if (diffInDays > 0) {
    return `${diffInDays} ngày trước`;
  } else if (diffInHours > 0) {
    return `${diffInHours} giờ trước`;
  } else if (diffInMinutes > 0) {
    return `${diffInMinutes} phút trước`;
  } else {
    return "Vừa xong";
  }
}

// Initialize tab functionality
function initializeTabs() {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      // Remove active class from all buttons and panes
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      tabPanes.forEach((pane) => pane.classList.remove("active"));

      // Add active class to clicked button and corresponding pane
      button.classList.add("active");
      const tabId = button.getAttribute("data-tab");
      document.getElementById(`tab-${tabId}`).classList.add("active");
    });
  });
}

// Hàm hiển thị danh sách chương theo trang
function displayChapters(page) {
  const startIndex = (page - 1) * CHAPTERS_PER_PAGE;
  const endIndex = startIndex + CHAPTERS_PER_PAGE;
  const chaptersToDisplay = allChapters.slice(startIndex, endIndex);

  const chapterList = document.getElementById("chapter-list");
  if (chapterList) {
    chapterList.innerHTML = chaptersToDisplay
      .map((chapter) => {
        // Kiểm tra chương bị khóa và user đã mua chưa
        const isLocked =
          chapter.isLocked || (!chapter.isFree && !chapter.isPurchased);
        const showLock = isLocked && !chapter.isPurchased;
        return `
          <div class="chapter-item">
            <a href="chapter.html?id=${chapter._id}">
              <div class="chapter-info">
                <div class="chapter-title-wrapper">
                  <span class="chapter-title">Chương ${chapter.number}: ${
          chapter.title
        }</span>
                  ${
                    showLock
                      ? '<i class="fas fa-lock chapter-lock-icon" title="Chương bị khóa" style="color:#d9534f;margin-left:8px;"></i>'
                      : ""
                  }
                </div>
                <div class="chapter-time">${formatTimeAgo(
                  new Date(chapter.createdAt)
                )}</div>
              </div>
            </a>
          </div>
        `;
      })
      .join("");
  }

  // Cập nhật phân trang
  updatePagination();
}

// Hàm cập nhật phân trang
function updatePagination() {
  const pagination = document.getElementById("chapter-pagination");
  if (!pagination) {
    console.warn("Pagination element not found");
    return;
  }
  const totalPages = Math.ceil(allChapters.length / CHAPTERS_PER_PAGE);
  let paginationHTML = "";
  // Nút Previous
  paginationHTML += `
    <li class="page-item">
      <button class="page-link" 
        onclick="changePage(${StoryDetail.page - 1})"
        ${StoryDetail.page === 1 ? "disabled" : ""}
      >
        Previous
      </button>
    </li>
  `;
  // Các nút số trang
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= StoryDetail.page - 2 && i <= StoryDetail.page + 2)
    ) {
      paginationHTML += `
        <li class="page-item">
          <button class="page-link ${i === StoryDetail.page ? "active" : ""}"
            onclick="changePage(${i})"
          >
            ${i}
          </button>
        </li>
      `;
    } else if (i === StoryDetail.page - 3 || i === StoryDetail.page + 3) {
      paginationHTML +=
        '<li class="page-item"><span class="page-link">...</span></li>';
    }
  }
  // Nút Next
  paginationHTML += `
    <li class="page-item">
      <button class="page-link" 
        onclick="changePage(${StoryDetail.page + 1})"
        ${StoryDetail.page === totalPages ? "disabled" : ""}
      >
        Next
      </button>
    </li>
  `;
  pagination.innerHTML = `<ul class="pagination-list">${paginationHTML}</ul>`;
}

function changePage(newPage) {
  const totalPages = Math.ceil(allChapters.length / CHAPTERS_PER_PAGE);
  if (newPage >= 1 && newPage <= totalPages) {
    StoryDetail.page = newPage;
    displayChapters(StoryDetail.page);
    updatePagination();
    // Cuộn lên đầu phần danh sách chương
    document
      .querySelector(".chapter-list")
      .scrollIntoView({ behavior: "smooth" });
  }
}

// Sửa hàm initRatingSystem để khắc phục lỗi hiển thị thông báo nhiều lần
function initRatingSystem() {
  const starsContainer = document.querySelector(".star-rating .stars");
  if (!starsContainer) return; // Đảm bảo container tồn tại

  const stars = starsContainer.querySelectorAll(".star");
  const ratingDescription = document.getElementById("rating-description");

  // Biến flag STATIC cho toàn bộ hàm thay vì chỉ trong phạm vi hàm
  let isSubmitting = false;

  // Kiểm tra xem người dùng đã đăng nhập chưa
  const token = localStorage.getItem("auth_token");
  const isLoggedIn = !!token;

  // Vô hiệu hóa ngôi sao nếu chưa đăng nhập hoặc đã đánh giá
  if (!isLoggedIn || hasUserRated) {
    starsContainer.classList.add("disabled");
    stars.forEach((star) => (star.style.pointerEvents = "none"));
    if (!isLoggedIn) {
      starsContainer.title = "Hãy đăng nhập để đánh giá";
    } else if (hasUserRated) {
      starsContainer.title = "Bạn đã đánh giá truyện này";
    }

    // Nếu đã có đánh giá, hiển thị ngay (tránh nhấp nháy)
    if (hasUserRated && currentUserRating) {
      highlightStars(currentUserRating, false, stars);
    }

    return; // Không khởi tạo event listeners nếu không cần thiết
  }

  // Xóa tất cả event listener cũ (tránh đăng ký nhiều lần)
  const freshStars = [];
  stars.forEach((star) => {
    const newStar = star.cloneNode(true);
    star.parentNode.replaceChild(newStar, star);
    freshStars.push(newStar);
  });

  // Thêm các event listener mới
  freshStars.forEach((star) => {
    star.addEventListener("mouseenter", function () {
      if (hasUserRated || isSubmitting) return;
      const value = parseInt(this.getAttribute("data-value"));
      highlightStars(value, true, freshStars); // true = trạng thái hover
      ratingDescription.textContent = ratingDescriptions[value];
    });

    star.addEventListener("mouseleave", function () {
      if (hasUserRated || isSubmitting) return;
      highlightStars(0, true, freshStars); // Xóa highlight hover khi rời chuột
      ratingDescription.textContent = "";
    });

    star.addEventListener("click", function () {
      // Người dùng không thể click nếu đã đánh giá do pointer-events: none
      // nên không cần hiển thị thông báo ở đây nữa
      // if (hasUserRated) {
      //   alert("Bạn đã đánh giá truyện này rồi.");
      //   return;
      // }

      if (isSubmitting) {
        return; // Đang xử lý, không cho click nữa
      }

      const value = parseInt(this.getAttribute("data-value"));

      // Đánh dấu đang xử lý
      isSubmitting = true;

      // Thay thế confirm bằng hộp thoại tùy chỉnh
      const confirmMessage =
        "Bạn chỉ có 1 lần để đánh giá, hãy thử đọc truyện trước rồi quay lại sau !!!";

      showCustomConfirm(
        confirmMessage,
        function () {
          // Người dùng nhấn "Tiếp tục"
          submitRating(value).finally(() => {
            // Reset flag sau khi hoàn thành hoặc lỗi
            setTimeout(() => {
              isSubmitting = false;
            }, 500);
          });
        },
        function () {
          // Người dùng nhấn "Thoát"
          console.log("User cancelled rating.");
          highlightStars(0, true, freshStars);
          ratingDescription.textContent = "";
          // Reset flag với delay nhỏ để tránh click nhanh
          setTimeout(() => {
            isSubmitting = false;
          }, 500);
        }
      );
    });
  });

  // Hiển thị đánh giá ban đầu của user
  highlightStars(currentUserRating || 0, false, freshStars);
}

// Hàm highlight các ngôi sao
function highlightStars(count, isHover = false, stars) {
  if (!stars || stars.length === 0) {
    const defaultStars = document.querySelectorAll(".star-rating .stars .star");
    stars = defaultStars;
  }

  stars.forEach((star) => {
    const starValue = parseInt(star.getAttribute("data-value"));
    if (isHover) {
      star.classList.toggle("hover", starValue <= count);
    } else {
      star.classList.remove("hover");
      star.classList.toggle("filled", starValue <= count);
    }
  });
}

// Load author's other stories
async function loadAuthorStories(authorName, currentStoryId) {
  try {
    console.log("Loading author stories for author:", authorName);
    console.log("Current story ID:", currentStoryId);

    if (!authorName) {
      console.log("No author name provided");
      const authorStoriesList = document.querySelector(".author-stories-list");
      if (authorStoriesList) {
        authorStoriesList.innerHTML = `
          <div class="no-stories">
            <p>Chưa có truyện nào</p>
          </div>
        `;
      }
      return;
    }

    const apiUrl = `/api/authors/name/${encodeURIComponent(
      authorName
    )}/stories`;
    console.log("Author stories API URL:", apiUrl);

    const response = await fetch(apiUrl);
    console.log("Author stories API response status:", response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Log response text before parsing JSON
    const responseText = await response.text();
    console.log("Author stories API response text:", responseText);

    // Try to parse JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("Error parsing JSON:", e);
      throw new Error("Invalid JSON response from server");
    }

    console.log("Author stories response:", data);

    const authorStoriesList = document.querySelector(".author-stories-list");
    if (!authorStoriesList) return;

    if (!data.stories || data.stories.length === 0) {
      authorStoriesList.innerHTML = `
        <div class="no-stories">
          <p>Chưa có truyện nào</p>
        </div>
      `;
      return;
    }

    // Filter out current story and limit to 5 stories
    const otherStories = data.stories
      .filter((story) => story._id !== currentStoryId)
      .slice(0, 5);

    console.log("Filtered stories:", otherStories);

    if (otherStories.length === 0) {
      authorStoriesList.innerHTML = `
        <div class="no-stories">
          <p>Chưa có truyện khác của tác giả</p>
        </div>
      `;
      return;
    }

    authorStoriesList.innerHTML = otherStories
      .map(
        (story) => `
        <div class="author-story-item">
          <a href="/story-detail.html?id=${story._id}">
            <div class="story-info">
              <div class="story-title">${story.title}</div>
            </div>
          </a>
        </div>
      `
      )
      .join("");
  } catch (error) {
    console.error("Error loading author stories:", error);
    const authorStoriesList = document.querySelector(".author-stories-list");
    if (authorStoriesList) {
      authorStoriesList.innerHTML = `
        <div class="no-stories">
          <p>Lỗi khi tải truyện của tác giả: ${error.message}</p>
        </div>
      `;
    }
  }
}

// Load top stories
async function loadTopStories(period = "day") {
  try {
    console.log("Loading top stories for period:", period);
    const apiUrl = `/api/stories/hot?period=${period}&limit=10`;
    console.log("Top stories API URL:", apiUrl);

    const response = await fetch(apiUrl);
    console.log("Top stories API response status:", response.status);

    if (!response.ok) {
      throw new Error("Không tìm thấy truyện");
    }

    const responseText = await response.text();
    console.log("Top stories API response text:", responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("Error parsing JSON:", e);
      throw new Error("Invalid JSON response from server");
    }

    console.log("Top stories response:", data);

    if (!data.success) {
      throw new Error(data.message || "Lỗi khi tải truyện hot");
    }

    const stories = data.stories || [];
    const topStoriesContainer = document.querySelector(".top-stories-list");

    if (!topStoriesContainer) {
      console.error("Top stories container not found");
      return;
    }

    if (stories.length === 0) {
      topStoriesContainer.innerHTML =
        '<div class="no-stories">Chưa có truyện nào</div>';
      return;
    }

    const storiesHTML = stories
      .map(
        (story, index) => `
      <div class="top-story-item ${index < 3 ? "top-" + (index + 1) : ""}">
        <span class="rank">${index + 1}</span>
        <a href="/story-detail.html?id=${story._id}" class="top-story-title">${
          story.title
        }</a>
        <span class="views">
          <i class="fas fa-eye"></i>
          ${story.views.toLocaleString("vi-VN")}
        </span>
      </div>
    `
      )
      .join("");

    topStoriesContainer.innerHTML = storiesHTML;
  } catch (error) {
    console.error("Error loading top stories:", error);
    const topStoriesContainer = document.querySelector(".top-stories-list");
    if (topStoriesContainer) {
      topStoriesContainer.innerHTML =
        '<div class="no-stories">Không thể tải truyện hot</div>';
    }
  }
}

// Initialize top stories tabs
document.addEventListener("DOMContentLoaded", () => {
  const tabButtons = document.querySelectorAll(".tab-btn");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      // Remove active class from all buttons
      tabButtons.forEach((btn) => btn.classList.remove("active"));

      // Add active class to clicked button
      button.classList.add("active");

      // Get period from data attribute
      const period = button.getAttribute("data-period") || "day";

      // Load stories for selected period
      loadTopStories(period);
    });
  });

  // Initial load of top stories (daily)
  loadTopStories("day");
});

// Load genres
async function loadGenresGrid() {
  try {
    console.log("Loading genres grid...");
    const response = await fetch("/api/genres?limit=1000"); // Increased limit to ensure we get all genres
    console.log("Genres API response status:", response.status);

    if (!response.ok) {
      throw new Error("Không thể tải danh sách thể loại");
    }

    const data = await response.json();
    console.log("Parsed genres data:", data);

    const genresGrid = document.getElementById("genres-grid");
    if (!genresGrid) {
      console.error("Genres grid element not found");
      return;
    }

    if (
      !data.success ||
      !data.data ||
      !data.data.genres ||
      !Array.isArray(data.data.genres) ||
      data.data.genres.length === 0
    ) {
      console.log("No genres found in response");
      genresGrid.innerHTML =
        '<div class="no-genres">Chưa có thể loại nào</div>';
      return;
    }

    const genres = data.data.genres;
    console.log("Found genres:", genres.length);

    // Sort genres alphabetically by name
    genres.sort((a, b) => a.name.localeCompare(b.name, "vi"));

    const genresHTML = genres
      .map(
        (genre) => `
      <div class="genre-item">
        <a href="/stories.html?genre=${encodeURIComponent(
          genre._id
        )}&genreName=${encodeURIComponent(genre.name)}&autoFilter=true" 
           data-genre-id="${genre._id}" 
           data-genre-name="${genre.name}"
           onclick="localStorage.setItem('selectedGenre', JSON.stringify({id: '${
             genre._id
           }', name: '${genre.name}'}))">
          ${genre.name}
        </a>
      </div>
    `
      )
      .join("");

    genresGrid.innerHTML = genresHTML;
    console.log("Genres grid loaded successfully:", genres.length, "genres");
  } catch (error) {
    console.error("Error loading genres grid:", error);
    const genresGrid = document.getElementById("genres-grid");
    if (genresGrid) {
      genresGrid.innerHTML = `<div class="no-genres">Lỗi khi tải danh sách thể loại: ${error.message}</div>`;
    }
  }
}

// Thêm nút TOP vào body
document.body.insertAdjacentHTML(
  "beforeend",
  '<button class="back-to-top" title="Về đầu trang"><i class="fas fa-arrow-up"></i></button>'
);

// Xử lý hiển thị/ẩn nút TOP
const backToTopButton = document.querySelector(".back-to-top");

window.addEventListener("scroll", () => {
  if (window.pageYOffset > 300) {
    backToTopButton.classList.add("visible");
  } else {
    backToTopButton.classList.remove("visible");
  }
});

// Xử lý sự kiện click nút TOP
backToTopButton.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
});
