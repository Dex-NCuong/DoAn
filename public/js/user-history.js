// DOM Elements
const usernameElement = document.getElementById("username");
const userCoinsElement = document.getElementById("userCoins");
const historyListElement = document.getElementById("history-list");
const loadingElement = document.getElementById("loading");
const noHistoryElement = document.getElementById("no-history");
const historyFilterSelect = document.getElementById("history-filter");
const logoutBtn = document.getElementById("logout-btn");
const clearHistoryBtn = document.getElementById("clear-history");

// Load page data on DOM load
document.addEventListener("DOMContentLoaded", () => {
  // Use simpler authentication check
  if (!localStorage.getItem("auth_token")) {
    window.location.href = "login.html?redirect=/user-history.html";
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

      // Load reading history
      loadReadingHistory();
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

  // Filter select
  if (historyFilterSelect) {
    historyFilterSelect.addEventListener("change", () => {
      loadReadingHistory();
    });
  }

  // Clear history button
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener("click", clearHistory);
  }
});

// Load reading history (Saved Chapters) and story list from server
async function loadReadingHistory() {
  try {
    loadingElement.style.display = "block";
    historyListElement.innerHTML = "";
    noHistoryElement.style.display = "none";

    const token = localStorage.getItem("auth_token");
    if (!token) {
      window.location.href = "login.html?redirect=/user-history.html";
      return;
    }

    // --- Fetch Saved Chapters ---
    const savedChaptersResponse = await fetch("/api/users/reading-history", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!savedChaptersResponse.ok)
      throw new Error(`HTTP error! status: ${savedChaptersResponse.status}`);
    const savedChaptersData = await savedChaptersResponse.json();
    if (
      !savedChaptersData.success ||
      !Array.isArray(savedChaptersData.history)
    ) {
      throw new Error(
        savedChaptersData.message || "Failed to load saved chapters"
      );
    }
    const allSavedChapters = savedChaptersData.history;
    console.log("API Response (Saved Chapters):", allSavedChapters);

    // Update clear history button visibility
    if (clearHistoryBtn) {
      clearHistoryBtn.style.display =
        allSavedChapters.length > 0 ? "inline-block" : "none";
    }

    // --- Populate Story Filter Dropdown ---
    const currentFilterValue = historyFilterSelect.value;
    historyFilterSelect.innerHTML =
      '<option value="all">Tất cả truyện</option>'; // Clear and add default

    // Create a Map of unique stories from saved chapters
    const uniqueStoriesFromSaved = new Map();
    allSavedChapters.forEach((item) => {
      if (item.story && item.story._id && item.story.title) {
        uniqueStoriesFromSaved.set(item.story._id, item.story.title);
      }
    });

    // Add options for each unique story
    uniqueStoriesFromSaved.forEach((title, id) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = title;
      historyFilterSelect.appendChild(option);
    });

    // Restore selection if possible
    if (
      historyFilterSelect.querySelector(`option[value="${currentFilterValue}"]`)
    ) {
      historyFilterSelect.value = currentFilterValue;
    }
    // --- End Populate Dropdown ---

    // --- Apply Story Filter ---
    const selectedStoryId = historyFilterSelect.value;
    let filteredHistory = allSavedChapters;
    if (selectedStoryId !== "all") {
      filteredHistory = allSavedChapters.filter(
        (item) => item.story && item.story._id === selectedStoryId
      );
    }
    // --- End Apply Story Filter ---

    loadingElement.style.display = "none";

    if (filteredHistory.length === 0) {
      noHistoryElement.style.display = "block";
      historyListElement.innerHTML = "";
      return;
    }

    renderReadingHistory(filteredHistory);
  } catch (error) {
    console.error("Error loading saved chapters page:", error);
    loadingElement.style.display = "none";
    showError("Có lỗi xảy ra khi tải trang");
    // Hide clear history button on error
    if (clearHistoryBtn) {
      clearHistoryBtn.style.display = "none";
    }
  }
}

// Render reading history (now Saved Chapters)
function renderReadingHistory(history) {
  historyListElement.innerHTML = "";

  const savedChapters = history;

  if (!savedChapters || savedChapters.length === 0) {
    noHistoryElement.style.display = "block";
    return;
  }

  savedChapters.forEach((item) => {
    if (!item || !item.story || !item.chapter) {
      console.warn("Skipping invalid saved chapter item:", item);
      return;
    }

    const historyItem = document.createElement("div");
    historyItem.className = "history-item simplified";
    historyItem.dataset.chapterId = item.chapter._id; // Add chapter ID for removal

    const savedDate = new Date(item.savedAt);
    const formattedDate = savedDate.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const storyTitle = item.story.title || "(Không có tiêu đề truyện)";
    const chapterTitle = item.chapter.title || `Chương ${item.chapter.number}`;
    const chapterId = item.chapter._id;

    // Updated HTML structure with buttons
    historyItem.innerHTML = `
      <div class="history-info simplified">
        <h3 class="history-title">
           ${storyTitle}: ${chapterTitle}
        </h3>
        <div class="history-time">
          <i class="fas fa-bookmark"></i> Đã lưu vào ${formattedDate}
        </div>
      </div>
      <div class="history-actions">
        <a href="chapter.html?id=${chapterId}" class="btn btn-sm btn-primary read-again-btn">
           <i class="fas fa-book-open"></i> Đọc tiếp
        </a>
        <button class="btn btn-sm btn-danger unsave-btn" data-chapter-id="${chapterId}">
           <i class="fas fa-trash-alt"></i> Xóa
        </button>
      </div>
    `;

    historyListElement.appendChild(historyItem);

    // Add event listener for the new delete button
    const unsaveBtn = historyItem.querySelector(".unsave-btn");
    if (unsaveBtn) {
      unsaveBtn.addEventListener("click", () => unsaveChapter(chapterId));
    }
  });
}

// Function to unsave a chapter
async function unsaveChapter(chapterId) {
  // Add confirmation before unsaving
  if (!confirm("Bạn có chắc chắn muốn xóa chương này khỏi lịch sử đọc?")) {
    return;
  }
  try {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      window.location.href = "login.html?redirect=/user-history.html";
      return;
    }

    // Use the toggle save endpoint, as /unsave doesn't exist
    const response = await fetch(`/api/chapters/${chapterId}/save`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();

    // Check if the action resulted in the chapter being unsaved
    if (data.success && !data.isSaved) {
      // Remove the item from UI
      const historyItem = document.querySelector(
        `[data-chapter-id="${chapterId}"]`
      );
      if (historyItem) {
        historyItem.remove();
      }
      showToast("Đã xóa chương khỏi lịch sử.", "success");

      // Check if there are any remaining items
      const remainingItems = historyListElement.children.length;
      if (remainingItems === 0) {
        noHistoryElement.style.display = "block";
        // Hide clear history button when no items remain
        if (clearHistoryBtn) {
          clearHistoryBtn.style.display = "none";
        }
      }
    } else {
      // Handle cases where the API succeeded but didn't unsave (e.g., already unsaved)
      // or if the API failed
      showError(data.message || "Không thể bỏ lưu chương này");
    }
  } catch (error) {
    console.error("Error unsaving chapter:", error);
    showError("Có lỗi xảy ra khi bỏ lưu chương");
  }
}

// Add CSS for the action buttons
const actionButtonsStyle = document.createElement("style");
actionButtonsStyle.textContent = `
  .history-item .history-actions {
    margin-left: auto; /* Push buttons to the right */
    display: flex;
    gap: 5px; /* Space between buttons */
    align-items: center;
  }
  .history-item.simplified {
     border-bottom: 1px solid #eee; /* Add separator line */
  }
  .history-item.simplified:last-child {
     border-bottom: none; /* Remove border for the last item */
  }
`;
document.head.appendChild(actionButtonsStyle);

// Show error message
function showError(message) {
  loadingElement.style.display = "none";
  historyListElement.innerHTML = "";

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
      loadReadingHistory();
    });
  }
}

// Show toast message
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  document.body.appendChild(toast);

  // Fade in
  setTimeout(() => {
    toast.classList.add("show");
  }, 100);

  // Auto hide after 3 seconds
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}

// Handle logout
function logout() {
  // Clear user data
  localStorage.removeItem("auth_token");
  localStorage.removeItem("user");

  // Redirect to homepage
  window.location.href = "index.html";
}

// Add this function to handle clearing all history
async function clearHistory() {
  if (!confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử đọc?")) {
    return;
  }

  try {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      window.location.href = "login.html?redirect=/user-history.html";
      return;
    }

    const response = await fetch("/api/users/reading-history", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();

    if (data.success) {
      // Clear the history list
      historyListElement.innerHTML = "";
      // Show no history message
      noHistoryElement.style.display = "block";
      // Hide clear history button
      if (clearHistoryBtn) {
        clearHistoryBtn.style.display = "none";
      }
      // Reset filter dropdown
      historyFilterSelect.innerHTML =
        '<option value="all">Tất cả truyện</option>';
      // Show success message
      showToast("Đã xóa toàn bộ lịch sử đọc", "success");
    } else {
      showError(data.message || "Không thể xóa lịch sử đọc");
    }
  } catch (error) {
    console.error("Error clearing history:", error);
    showError("Có lỗi xảy ra khi xóa lịch sử đọc");
  }
}
