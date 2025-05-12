document.addEventListener("DOMContentLoaded", async () => {
  // Lấy storyId và chapterId từ URL
  const urlParams = new URLSearchParams(window.location.search);
  const storyId = urlParams.get("storyId");
  const chapterNumber = urlParams.get("chapter");

  if (storyId && chapterNumber) {
    try {
      // Lấy thông tin chương
      const response = await fetch(
        `/api/stories/${storyId}/chapters/${chapterNumber}`
      );
      if (response.ok) {
        const chapter = await response.json();

        // Khởi tạo tracker cho chương
        window.viewTracker.initChapter(storyId, chapter._id);

        // Xử lý khi người dùng rời khỏi trang
        window.addEventListener("beforeunload", () => {
          window.viewTracker.clearViewTimer();
        });
      }
    } catch (error) {
      console.error("Lỗi khi tải thông tin chương:", error);
    }
  }
});
