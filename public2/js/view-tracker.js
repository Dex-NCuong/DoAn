class ViewTracker {
  constructor() {
    this.storyId = null;
    this.chapterId = null;
    this.viewTimer = null;
    this.viewStartTime = null;
    this.minViewTime = 2000; // 2 giây
    this.viewedChapters = new Set(); // Lưu trữ các chương đã xem
  }

  // Khởi tạo tracker cho truyện
  initStory(storyId) {
    this.storyId = storyId;
    this.incrementStoryViews();
  }

  // Khởi tạo tracker cho chương
  initChapter(storyId, chapterId) {
    this.storyId = storyId;
    this.chapterId = chapterId;
    this.startChapterViewTimer();
  }

  // Tăng lượt xem truyện
  async incrementStoryViews() {
    try {
      // Tăng lượt xem ngay lập tức trên giao diện
      const viewsElement = document.getElementById("story-views");
      if (viewsElement) {
        const currentViews = parseInt(viewsElement.textContent) || 0;
        viewsElement.textContent = currentViews + 1;
      }

      // Gửi request tăng lượt xem lên server
      const response = await fetch(
        `/api/stories/${this.storyId}/increment-views`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Cập nhật lại số lượt xem chính xác từ server
        if (viewsElement) {
          viewsElement.textContent = data.views;
        }
      }
    } catch (error) {
      console.error("Lỗi khi tăng lượt xem truyện:", error);
    }
  }

  // Bắt đầu đếm thời gian xem chương
  startChapterViewTimer() {
    // Nếu đã xem chương này rồi, không cần đếm thời gian
    if (this.viewedChapters.has(this.chapterId)) {
      this.incrementChapterViews();
      return;
    }

    this.viewStartTime = Date.now();
    this.viewTimer = setTimeout(() => {
      this.incrementChapterViews();
      this.viewedChapters.add(this.chapterId);
    }, this.minViewTime);
  }

  // Tăng lượt xem chương
  async incrementChapterViews() {
    try {
      const response = await fetch(
        `/api/stories/${this.storyId}/chapters/${this.chapterId}/increment-views`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        // Cập nhật số lượt xem trên giao diện nếu cần
        console.log("Đã tăng lượt xem chương:", data.views);
      }
    } catch (error) {
      console.error("Lỗi khi tăng lượt xem chương:", error);
    }
  }

  // Hủy timer khi rời khỏi chương
  clearViewTimer() {
    if (this.viewTimer) {
      clearTimeout(this.viewTimer);
      this.viewTimer = null;
    }
  }
}

// Tạo instance của ViewTracker
const viewTracker = new ViewTracker();

// Export để sử dụng trong các file khác
window.viewTracker = viewTracker;
