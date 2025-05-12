document.addEventListener("DOMContentLoaded", () => {
  const chapterId = getChapterIdFromUrl();
  if (chapterId) {
    loadChapterData(chapterId);
    loadAndApplySettings();
    setupEventListeners();
  } else {
    showError("Không tìm thấy ID chương.");
  }
  // auth.js should handle header rendering

  // Initialize Scroll to Top Button
  initScrollToTop();
});

// --- DOM Elements ---
const storyLinkElement = document.getElementById("story-link");
const chapterTitleElement = document.getElementById("chapter-title");
const chapterContentElement = document.getElementById("chapter-content");
const chapterContentWrapper = document.getElementById(
  "chapter-content-wrapper"
);

const prevBtnTop = document.getElementById("prev-chap-btn-top");
const nextBtnTop = document.getElementById("next-chap-btn-top");
const prevBtnBottom = document.getElementById("prev-chap-btn-bottom");
const nextBtnBottom = document.getElementById("next-chap-btn-bottom");

const prevLinkTop = document.getElementById("prev-chap-link-top");
const nextLinkTop = document.getElementById("next-chap-link-top");
const prevLinkBottom = document.getElementById("prev-chap-link-bottom");
const nextLinkBottom = document.getElementById("next-chap-link-bottom");

const configBtn = document.getElementById("config-btn");
const configPanel = document.getElementById("config-panel");
const closeConfigBtn = document.getElementById("close-config-btn");
const colorOptions = document.querySelectorAll(".color-option");
const fontSelect = document.getElementById("font-select");
const decreaseFontSizeBtn = document.getElementById("decrease-font-size");
const increaseFontSizeBtn = document.getElementById("increase-font-size");
const fontSizeDisplay = document.getElementById("font-size-display");
const decreaseWidthBtn = document.getElementById("decrease-width");
const increaseWidthBtn = document.getElementById("increase-width");
const widthDisplay = document.getElementById("width-display");
const decreaseLineHeightBtn = document.getElementById("decrease-line-height");
const increaseLineHeightBtn = document.getElementById("increase-line-height");
const lineHeightDisplay = document.getElementById("line-height-display");
const resetConfigBtn = document.getElementById("reset-config-btn");

// Add loading elements
const loadingElement = document.createElement("div");
loadingElement.className = "loading-overlay";
loadingElement.innerHTML = `
  <div class="loading-spinner">
    <i class="fas fa-spinner fa-spin"></i>
    <span>Đang tải...</span>
  </div>
`;
document.body.appendChild(loadingElement);

// Loading functions
function showLoading() {
  loadingElement.style.display = "flex";
  if (chapterContentElement) {
    chapterContentElement.style.opacity = "0.5";
  }
}

function hideLoading() {
  loadingElement.style.display = "none";
  if (chapterContentElement) {
    chapterContentElement.style.opacity = "1";
  }
}

// Add CSS for loading overlay
const loadingStyle = document.createElement("style");
loadingStyle.textContent = `
  .loading-overlay {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    justify-content: center;
    align-items: center;
    z-index: 9999;
  }

  .loading-spinner {
    background: white;
    padding: 20px;
    border-radius: 8px;
    text-align: center;
  }

  .loading-spinner i {
    font-size: 24px;
    color: #007bff;
    margin-right: 10px;
  }

  .loading-spinner span {
    color: #333;
    font-size: 16px;
  }
`;
document.head.appendChild(loadingStyle);

// --- Settings Variables ---
let currentSettings = {
  backgroundColor: "#f8f1e3", // Default: Vàng be
  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  fontSize: 22, // px
  maxWidth: 1200, // Default: 150% width (assuming 800px is 100%)
  lineHeight: 1.8, // unitless (corresponds to 180%)
  // isDarkMode is no longer needed as body background is fixed dark via CSS
};

const defaultSettings = { ...currentSettings };

// --- Functions ---

function getChapterIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

async function loadChapterData(chapterId) {
  try {
    showLoading();
    const token = localStorage.getItem("auth_token");
    const headers = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`/api/chapters/${chapterId}`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || "Failed to load chapter data");
    }

    // Update save button state based on isSaved status
    const saveButton = document.getElementById("save-chapter-btn");
    if (saveButton) {
      if (data.data.chapter.isSaved) {
        saveButton.innerHTML = '<i class="fas fa-bookmark"></i> Hủy lưu';
        saveButton.classList.add("saved");
      } else {
        saveButton.innerHTML = '<i class="far fa-bookmark"></i> Lưu chương';
        saveButton.classList.remove("saved");
      }
    }

    // Update story link
    if (data.data.story) {
      const storyLink = document.getElementById("story-link");
      if (storyLink) {
        storyLink.href = `story-detail.html?id=${data.data.story._id}`;
        storyLink.textContent = data.data.story.title;
      }
    }

    // Update chapter title and content
    const chapterTitle = document.getElementById("chapter-title");
    const chapterContent = document.getElementById("chapter-content");
    if (chapterTitle && chapterContent) {
      const chapterData = data.data.chapter;
      chapterTitle.textContent = `Chương ${chapterData.number}: ${chapterData.title}`;

      if (chapterData.isLocked) {
        // Gọi hàm handleLockedChapter để xử lý hiển thị và navigation đúng chuẩn
        handleLockedChapter(data.data);
      } else {
        // Format and display the chapter content with proper line breaks
        const formattedContent = chapterData.content
          .split("\n")
          .map((paragraph) => paragraph.trim())
          .filter((paragraph) => paragraph.length > 0)
          .map((paragraph) => `<p>${paragraph}</p>`)
          .join("\n");

        chapterContent.innerHTML = formattedContent;
      }
    }

    // Update navigation buttons and links
    const { prevChapter, nextChapter } = data.data;

    // Update navigation buttons
    updateNavElement(prevBtnTop, prevChapter);
    updateNavElement(nextBtnTop, nextChapter);
    updateNavElement(prevBtnBottom, prevChapter);
    updateNavElement(nextBtnBottom, nextChapter);

    // Update adjacent chapter links
    updateAdjacentLink(prevLinkTop, prevChapter, "trước");
    updateAdjacentLink(nextLinkTop, nextChapter, "sau");
    updateAdjacentLink(prevLinkBottom, prevChapter, "trước");
    updateAdjacentLink(nextLinkBottom, nextChapter, "sau");

    hideLoading();
  } catch (error) {
    console.error("Error loading chapter data:", error);
    showError("Có lỗi xảy ra khi tải nội dung chương");
    hideLoading();
  }
}

function populateChapterData(data) {
  const { chapter, story, prevChapter, nextChapter } = data;

  console.log("Populating data:", { chapter, story, prevChapter, nextChapter }); // Log received data

  // Update Titles
  document.title = `${chapter.title} - ${story.title}`;
  storyLinkElement.textContent = story.title;
  storyLinkElement.href = `story-detail.html?id=${story._id}`;
  chapterTitleElement.textContent = `Chương ${chapter.number}: ${chapter.title}`;

  // Update Content
  // Replace newlines with <p> tags for HTML display
  const paragraphs = chapter.content
    .split(/\n\s*\n|\n/)
    .filter((p) => p.trim() !== "");
  const formattedContent = paragraphs.map((p) => `<p>${p.trim()}</p>`).join("");
  chapterContentElement.innerHTML = formattedContent;

  // Update Navigation Buttons
  console.log("Updating top nav buttons:", { prevChapter, nextChapter });
  updateNavElement(prevBtnTop, prevChapter);
  updateNavElement(nextBtnTop, nextChapter);
  console.log("Updating bottom nav buttons:", { prevChapter, nextChapter });
  updateNavElement(prevBtnBottom, prevChapter);
  updateNavElement(nextBtnBottom, nextChapter);

  // Update Adjacent Chapter Links
  console.log("Updating top adjacent links:", { prevChapter, nextChapter });
  updateAdjacentLink(prevLinkTop, prevChapter, "trước");
  updateAdjacentLink(nextLinkTop, nextChapter, "sau");
  console.log("Updating bottom adjacent links:", { prevChapter, nextChapter });
  updateAdjacentLink(prevLinkBottom, prevChapter, "trước");
  updateAdjacentLink(nextLinkBottom, nextChapter, "sau");
}

function updateNavElement(element, chapterData) {
  if (chapterData && chapterData._id) {
    element.dataset.targetId = chapterData._id;
    element.classList.remove("disabled");
  } else {
    element.dataset.targetId = "null";
    element.classList.add("disabled");
  }
}

function updateAdjacentLink(element, chapterData, direction) {
  if (chapterData && chapterData._id) {
    element.href = `chapter.html?id=${chapterData._id}`;

    // Create text with chapter number and title without date
    element.textContent = `Chương ${chapterData.number}: ${chapterData.title}`;

    element.classList.remove("disabled");
    element.style.visibility = "visible";
  } else {
    element.href = "#";
    element.textContent = "...";
    element.classList.add("disabled");
    element.style.visibility = "hidden";
  }
}

function disableNavButtons() {
  [
    prevBtnTop,
    nextBtnTop,
    prevBtnBottom,
    nextBtnBottom,
    prevLinkTop,
    nextLinkTop,
    prevLinkBottom,
    nextLinkBottom,
  ].forEach((btn) => {
    btn.classList.add("disabled");
    btn.dataset.targetId = "null";
    if (btn.classList.contains("adjacent-link")) {
      btn.textContent = btn.classList.contains("prev-link")
        ? "Chương trước: ..."
        : "Chương sau: ...";
      btn.style.visibility = "hidden";
    }
  });
}

function showError(message) {
  chapterContentElement.innerHTML = `<div class="error-message" style="text-align: center; padding: 20px; color: red;">
            <i class="fas fa-exclamation-triangle"></i> ${message}
         </div>`;
}

// --- Configuration Panel Logic ---

function toggleConfigPanel() {
  configPanel.classList.toggle("hidden");
}

function applySettings() {
  const chapterContainer = document.querySelector(".chapter-container");
  const contentWrapper = document.getElementById("chapter-content-wrapper");
  const contentElement = document.getElementById("chapter-content");

  // Apply settings ONLY to specific elements
  if (contentWrapper) {
    contentWrapper.style.backgroundColor = currentSettings.backgroundColor;
    // Determine text color based on background brightness
    const bgColor = currentSettings.backgroundColor;
    const isDarkBg = /^#[0-5]/.test(bgColor); // Simple check for dark hex colors
    const isBlack = bgColor === "#212529" || bgColor === "#000000"; // Explicit check for black/near-black
    contentWrapper.style.color = isDarkBg || isBlack ? "#e9ecef" : "#333"; // Light text for dark bg
  }
  if (contentElement) {
    contentElement.style.fontFamily = currentSettings.fontFamily;
    contentElement.style.fontSize = `${currentSettings.fontSize}px`;
    contentElement.style.lineHeight = currentSettings.lineHeight;
  }
  if (chapterContainer) {
    // This controls the width of the main content box
    chapterContainer.style.maxWidth = `${currentSettings.maxWidth}px`;
  }

  // NO LONGER apply dark-mode class to body here
  // document.body.classList.toggle('dark-mode', currentSettings.isDarkMode);

  // Update display in config panel
  updateConfigPanelDisplay();
}

function saveSettings() {
  // Remove isDarkMode before saving if it exists
  const settingsToSave = { ...currentSettings };
  delete settingsToSave.isDarkMode;
  localStorage.setItem("readingSettings", JSON.stringify(settingsToSave));
}

function loadAndApplySettings() {
  const savedSettings = localStorage.getItem("readingSettings");
  // Start with the new defaults (beige background for content)
  currentSettings = { ...defaultSettings };
  if (savedSettings) {
    try {
      const parsedSaved = JSON.parse(savedSettings);
      // Merge saved settings OVER the defaults
      // Make sure not to merge a saved isDarkMode if it exists from old versions
      delete parsedSaved.isDarkMode;
      currentSettings = { ...currentSettings, ...parsedSaved };

      // Re-validate numeric values
      currentSettings.fontSize = parseInt(currentSettings.fontSize, 10);
      currentSettings.maxWidth = parseInt(currentSettings.maxWidth, 10);
      currentSettings.lineHeight = parseFloat(currentSettings.lineHeight);
      if (isNaN(currentSettings.fontSize))
        currentSettings.fontSize = defaultSettings.fontSize;
      if (isNaN(currentSettings.maxWidth))
        currentSettings.maxWidth = defaultSettings.maxWidth;
      if (isNaN(currentSettings.lineHeight))
        currentSettings.lineHeight = defaultSettings.lineHeight;

      console.log("Loaded and merged settings:", currentSettings);
    } catch (e) {
      console.error("Failed to parse saved settings:", e);
    }
  } else {
    console.log("No saved settings found, using defaults.");
  }
  applySettings();
}

function updateConfigPanelDisplay() {
  // Update active color
  colorOptions.forEach((option) => {
    option.classList.remove("active");
    if (option.dataset.color === currentSettings.backgroundColor) {
      option.classList.add("active");
    }
  });
  fontSelect.value = currentSettings.fontFamily;
  fontSizeDisplay.textContent = `${currentSettings.fontSize}px`;

  // Calculate width percentage relative to 800px base for display
  const baseWidth = 800;
  const widthPercent = Math.round((currentSettings.maxWidth / baseWidth) * 100);
  widthDisplay.textContent = `${widthPercent}%`;

  lineHeightDisplay.textContent = `${Math.round(
    currentSettings.lineHeight * 100
  )}%`;
}

function resetSettings() {
  currentSettings = { ...defaultSettings };
  applySettings();
  saveSettings();
}

// --- Event Listeners ---
function setupEventListeners() {
  configBtn.addEventListener("click", toggleConfigPanel);
  closeConfigBtn.addEventListener("click", toggleConfigPanel);

  // Thêm event listener cho nút lưu chương
  const saveButton = document.getElementById("save-chapter-btn");
  if (saveButton) {
    saveButton.addEventListener("click", saveChapter);
  }

  colorOptions.forEach((option) => {
    option.addEventListener("click", () => {
      currentSettings.backgroundColor = option.dataset.color;
      applySettings();
      saveSettings();
    });
  });
  fontSelect.addEventListener("change", (e) => {
    currentSettings.fontFamily = e.target.value;
    applySettings();
    saveSettings();
  });
  decreaseFontSizeBtn.addEventListener("click", () => {
    if (currentSettings.fontSize > 10) {
      // Min font size
      currentSettings.fontSize -= 1;
      applySettings();
      saveSettings();
    }
  });
  increaseFontSizeBtn.addEventListener("click", () => {
    if (currentSettings.fontSize < 40) {
      // Max font size
      currentSettings.fontSize += 1;
      applySettings();
      saveSettings();
    }
  });
  decreaseWidthBtn.addEventListener("click", () => {
    if (currentSettings.maxWidth > 400) {
      // Min width
      currentSettings.maxWidth -= 50;
      applySettings();
      saveSettings();
    }
  });
  increaseWidthBtn.addEventListener("click", () => {
    if (currentSettings.maxWidth < 1200) {
      // Max width
      currentSettings.maxWidth += 50;
      applySettings();
      saveSettings();
    }
  });
  decreaseLineHeightBtn.addEventListener("click", () => {
    if (currentSettings.lineHeight > 1.0) {
      // Min line height
      currentSettings.lineHeight = parseFloat(
        (currentSettings.lineHeight - 0.1).toFixed(1)
      );
      applySettings();
      saveSettings();
    }
  });
  increaseLineHeightBtn.addEventListener("click", () => {
    if (currentSettings.lineHeight < 3.0) {
      // Max line height
      currentSettings.lineHeight = parseFloat(
        (currentSettings.lineHeight + 0.1).toFixed(1)
      );
      applySettings();
      saveSettings();
    }
  });
  resetConfigBtn.addEventListener("click", resetSettings);
  document.addEventListener("click", (event) => {
    if (
      !configPanel.contains(event.target) &&
      !configBtn.contains(event.target) &&
      !configPanel.classList.contains("hidden")
    ) {
      toggleConfigPanel();
    }
  });
  prevBtnTop.addEventListener("click", handleNavClick);
  nextBtnTop.addEventListener("click", handleNavClick);
  prevBtnBottom.addEventListener("click", handleNavClick);
  nextBtnBottom.addEventListener("click", handleNavClick);
}

function handleNavClick(event) {
  event.preventDefault(); // Prevent default link behavior
  const button = event.currentTarget;
  const targetId = button.dataset.targetId;

  console.log("Nav button clicked:", { buttonId: button.id, targetId });

  if (targetId && targetId !== "null") {
    // Valid target chapter ID exists, navigate
    window.location.href = `chapter.html?id=${targetId}`;
  } else {
    // No valid target ID (start or end of story)
    if (button.id.includes("prev")) {
      alert("Xin lỗi, đây là chương cũ nhất rồi !!!");
    } else if (button.id.includes("next")) {
      alert("Xin lỗi, đây là chương mới nhất rồi !!!");
    }
  }
}

// Function to handle locked chapters (requires purchase)
function handleLockedChapter(data) {
  const { chapter, story } = data;
  const price = chapter.coinPrice || data.price || chapter.price || "???"; // Ưu tiên coinPrice

  // Update titles
  document.title = `(Khóa) ${chapter.title} - ${story.title}`;
  storyLinkElement.textContent = story.title;
  storyLinkElement.href = `story-detail.html?id=${story._id}`;
  chapterTitleElement.textContent = `(Chương bị khóa) Chương ${chapter.number}: ${chapter.title}`;

  // Show lock message and preview (KHÔNG hiển thị dòng 'Chương này yêu cầu ... để mở khóa')
  chapterContentElement.innerHTML = `
    <div class="locked-chapter-message" style="text-align: center; padding: 20px; border: 1px solid #ffc107; border-radius: 5px; background-color: #fff3cd; margin-bottom: 20px;">
      <i class="fas fa-lock"></i>
      <h3>Chương này cần trả phí để đọc</h3>
      <button id="purchase-chapter-btn" class="btn btn-primary">Mua chương</button>
    </div>
    <h4>Xem trước nội dung:</h4>
    <div class="chapter-preview">${chapter.preview.replace(/\n/g, "<br>")}</div>
  `;

  // KHÔNG disable navigation khi chương bị khóa
  // (Không gọi disableNavButtons())

  // Add event listener for purchase button
  const purchaseBtn = document.getElementById("purchase-chapter-btn");
  if (purchaseBtn) {
    purchaseBtn.addEventListener("click", () =>
      showPurchaseModal(chapter._id, price)
    );
  }
}

// Hiển thị modal xác nhận mua chương
function showPurchaseModal(chapterId, price) {
  // Nếu đã có modal thì xóa trước
  let oldModal = document.getElementById("purchase-modal");
  if (oldModal) oldModal.remove();

  // Tạo modal
  const modal = document.createElement("div");
  modal.id = "purchase-modal";
  modal.style.position = "fixed";
  modal.style.top = "0";
  modal.style.left = "0";
  modal.style.width = "100vw";
  modal.style.height = "100vh";
  modal.style.background = "rgba(0,0,0,0.3)";
  modal.style.display = "flex";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.zIndex = "9999";
  modal.innerHTML = `
    <div style="background: #fff; padding: 32px 24px; border-radius: 8px; min-width: 320px; box-shadow: 0 2px 16px #0002; text-align: center;">
      <div style="font-size: 18px; margin-bottom: 16px;">Để mở khóa cần: <b>${price} xu</b></div>
      <div style="display: flex; gap: 16px; justify-content: center;">
        <button id="confirm-purchase-btn" class="btn btn-success">Xác nhận</button>
        <button id="cancel-purchase-btn" class="btn btn-secondary">Hủy</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Sự kiện nút Hủy
  document.getElementById("cancel-purchase-btn").onclick = () => {
    modal.remove();
  };
  // Sự kiện nút Xác nhận
  document.getElementById("confirm-purchase-btn").onclick = async () => {
    modal.remove();
    await purchaseChapter(chapterId);
  };
}

// Function to handle chapter purchase (đã cài đặt đầy đủ)
async function purchaseChapter(chapterId) {
  try {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      alert("Vui lòng đăng nhập để mua chương!");
      return;
    }
    const response = await fetch(`/api/chapters/purchase/${chapterId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    if (
      response.ok &&
      (data.success || data.msg === "Đã mua chương thành công")
    ) {
      alert("Mua chương thành công!");
      loadChapterData(chapterId); // Reload để hiển thị nội dung đầy đủ
    } else {
      alert(
        `Lỗi khi mua chương: ${data.message || data.msg || response.statusText}`
      );
    }
  } catch (error) {
    console.error("Purchase error:", error);
    alert("Lỗi kết nối khi mua chương.");
  }
}

// Kiểm tra trạng thái đăng nhập
const checkLoginStatus = async () => {
  try {
    const response = await fetch("/api/auth/me", {
      credentials: "include",
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error("Error checking login status:", error);
    return false;
  }
};

// Lưu chương đang đọc
const saveChapter = async () => {
  try {
    // Kiểm tra đăng nhập trước
    const isLoggedIn = await checkLoginStatus();
    if (!isLoggedIn) {
      showToast("Bạn cần đăng nhập để có thể lưu chương!", "error");
      return;
    }

    // Lấy chapterId từ URL
    const urlParams = new URLSearchParams(window.location.search);
    const chapterId = urlParams.get("id");

    if (!chapterId) {
      showToast("Không thể xác định ID chương", "error");
      return;
    }

    // Gửi request lưu/hủy lưu chương
    const token = localStorage.getItem("auth_token");
    if (!token) {
      showToast("Bạn cần đăng nhập để có thể lưu chương!", "error");
      return;
    }

    const saveResponse = await fetch(`/api/chapters/${chapterId}/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    });

    if (!saveResponse.ok) {
      throw new Error("Network response was not ok");
    }

    const data = await saveResponse.json();

    if (data.success) {
      const saveButton = document.getElementById("save-chapter-btn");
      if (data.isSaved) {
        showToast("Đã lưu chương thành công!", "success");
        saveButton.innerHTML = '<i class="fas fa-bookmark"></i> Hủy lưu';
        saveButton.classList.add("saved");
      } else {
        showToast("Đã hủy lưu chương!", "info");
        saveButton.innerHTML = '<i class="far fa-bookmark"></i> Lưu chương';
        saveButton.classList.remove("saved");
      }
    } else {
      showToast(data.msg || "Có lỗi xảy ra khi lưu chương", "error");
    }
  } catch (error) {
    console.error("Error saving chapter:", error);
    showToast("Có lỗi xảy ra khi lưu chương", "error");
  }
};

// Thêm hàm hiển thị toast message
const showToast = (message, type = "info") => {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  document.body.appendChild(toast);

  // Hiệu ứng fade in
  setTimeout(() => {
    toast.classList.add("show");
  }, 100);

  // Tự động ẩn sau 3 giây
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
};

// Thêm CSS cho toast
const style = document.createElement("style");
style.textContent = `
  .toast {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 24px;
    border-radius: 4px;
    color: white;
    opacity: 0;
    transition: opacity 0.3s ease;
    z-index: 9999;
  }
  
  .toast.show {
    opacity: 1;
  }
  
  .toast-success {
    background-color: #4CAF50;
  }
  
  .toast-error {
    background-color: #f44336;
  }
  
  .toast-info {
    background-color: #2196F3;
  }
`;
document.head.appendChild(style);

// Function to initialize the scroll-to-top button
function initScrollToTop() {
  const scrollToTopBtn = document.getElementById("scrollToTopBtn");

  if (!scrollToTopBtn) return;

  // Show/hide button based on scroll position
  window.addEventListener("scroll", () => {
    if (window.pageYOffset > 200 || document.documentElement.scrollTop > 200) {
      scrollToTopBtn.classList.add("visible");
    } else {
      scrollToTopBtn.classList.remove("visible");
    }
  });

  // Scroll to top when button is clicked
  scrollToTopBtn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth", // Smooth scrolling animation
    });
  });
}
