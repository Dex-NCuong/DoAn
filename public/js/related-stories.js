// Hàm lấy truyện cùng thể loại
async function getRelatedStories(currentStoryId, genres) {
  try {
    if (!currentStoryId || !genres || genres.length === 0) {
      console.log("Missing required parameters:", { currentStoryId, genres });
      return [];
    }

    // Encode genres trước khi gửi request
    const encodedGenres = genres.map((genre) => encodeURIComponent(genre));
    const queryString = `/api/stories/related?storyId=${currentStoryId}&genres=${encodedGenres.join(
      ","
    )}`;

    console.log("Đang gửi request đến:", queryString);

    const response = await fetch(queryString);

    if (!response.ok) {
      console.error("Lỗi response:", response.status, response.statusText);
      const errorText = await response.text();
      console.error("Error response body:", errorText);
      throw new Error(`Lỗi khi gọi API: ${response.status}`);
    }

    const stories = await response.json();
    console.log("Đã nhận được truyện liên quan:", stories.length, "truyện");
    return stories;
  } catch (error) {
    console.error("Lỗi khi lấy truyện liên quan:", error);
    return [];
  }
}

// Hàm tạo HTML cho một truyện
function createStoryCard(story) {
  if (!story || !story._id) {
    console.error("Invalid story data:", story);
    return "";
  }

  const coverImage = story.coverImage || "/images/default-cover.jpg";
  const rating = story.rating?.average || 0;
  const totalChapters = story.totalChapters || 0;
  const genres = story.genres || [];

  return `
    <div class="related-story-card">
      <a href="/story-detail.html?id=${story._id}">
        <img src="${coverImage}" alt="${
    story.title
  }" class="related-story-cover">
        <div class="related-story-info">
          <div class="related-story-title text-center">${story.title}</div>
          <div class="related-story-meta text-center">
            <div class="related-story-rating">
              <i class="fas fa-star star-icon"></i>
              <span>${rating.toFixed(1)}/10</span>
            </div>
            <div class="related-story-chapters">
              <i class="fas fa-book-open"></i>
              <span>${totalChapters} chương</span>
            </div>
          </div>
          ${
            genres.length > 0
              ? `
            <div class="related-story-genres text-center">
              ${genres
                .slice(0, 3)
                .map(
                  (genre) => `
                <span class="genre-tag">${genre}</span>
              `
                )
                .join("")}
            </div>
            `
              : ""
          }
        </div>
      </a>
    </div>
  `;
}

// Hàm cập nhật danh sách truyện cùng thể loại
async function updateRelatedStories(currentStoryId, genres) {
  const relatedStoriesList = document.getElementById("related-stories-list");
  if (!relatedStoriesList) {
    console.error("Related stories container not found");
    return;
  }

  // Hiển thị loading
  relatedStoriesList.innerHTML = '<div class="loading">Đang tải...</div>';

  try {
    const stories = await getRelatedStories(currentStoryId, genres);

    if (!stories || stories.length === 0) {
      relatedStoriesList.innerHTML =
        '<p class="no-stories">Không tìm thấy truyện cùng thể loại</p>';
      return;
    }

    // Tạo HTML cho danh sách truyện
    const storiesHTML = stories.map((story) => createStoryCard(story)).join("");
    relatedStoriesList.innerHTML = storiesHTML;
  } catch (error) {
    console.error("Error updating related stories:", error);
    relatedStoriesList.innerHTML =
      '<p class="error">Có lỗi xảy ra khi tải truyện cùng thể loại</p>';
  }
}

// Hàm khởi tạo
async function initRelatedStories() {
  try {
    // Lấy thông tin truyện hiện tại từ URL
    const urlParams = new URLSearchParams(window.location.search);
    const storyId = urlParams.get("id");

    if (!storyId) {
      console.error("Không tìm thấy ID truyện trong URL");
      return;
    }

    console.log("Đang lấy thông tin truyện với ID:", storyId);

    // Lấy thông tin truyện từ API
    const response = await fetch(`/api/stories/${storyId}`);
    if (!response.ok) {
      throw new Error(`Lỗi khi lấy thông tin truyện: ${response.status}`);
    }

    const data = await response.json();
    console.log("Thông tin truyện nhận được:", data);

    const story = data.data?.story;

    if (!story || !story.genres) {
      throw new Error("Không tìm thấy thông tin truyện hoặc thể loại");
    }

    // Lấy danh sách thể loại từ truyện
    const genres = story.genres.map((genre) => genre.name);
    console.log("Các thể loại của truyện:", genres);

    if (genres.length > 0) {
      // Cập nhật danh sách truyện cùng thể loại
      await updateRelatedStories(storyId, genres);
    } else {
      console.log("Truyện không có thể loại nào");
      const relatedStoriesList = document.getElementById(
        "related-stories-list"
      );
      if (relatedStoriesList) {
        relatedStoriesList.innerHTML =
          '<p class="no-stories">Không có thể loại cho truyện này</p>';
      }
    }
  } catch (error) {
    console.error("Lỗi khởi tạo truyện liên quan:", error);
    const relatedStoriesList = document.getElementById("related-stories-list");
    if (relatedStoriesList) {
      relatedStoriesList.innerHTML =
        '<p class="error">Có lỗi xảy ra khi tải truyện cùng thể loại</p>';
    }
  }
}

// Gọi hàm khởi tạo khi trang đã load xong
document.addEventListener("DOMContentLoaded", initRelatedStories);
