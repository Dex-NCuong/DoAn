// Global variables for storing filter states
let selectedGenre = null;
let selectedSort = null;
let selectedChapters = null;
let selectedStatus = null;

// Top Stories functionality
let currentTopStoriesTab = "day";

// Stories page JavaScript
document.addEventListener("DOMContentLoaded", async function () {
  try {
    // Add back to top button to the page
    const backToTopButton = document.createElement("button");
    backToTopButton.className = "back-to-top";
    backToTopButton.innerHTML = '<i class="fas fa-arrow-up"></i>';
    document.body.appendChild(backToTopButton);

    // Handle scroll event for back to top button
    window.addEventListener("scroll", () => {
      if (window.scrollY > 200) {
        backToTopButton.classList.add("visible");
      } else {
        backToTopButton.classList.remove("visible");
      }
    });

    // Handle click event for back to top button
    backToTopButton.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });

    // Load genres into dropdown
    await loadGenres();

    // Initialize filters
    initializeFilters();

    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const sortParam = urlParams.get("sort");
    const sortNameParam = urlParams.get("sortName");
    const genreParam = urlParams.get("genre");
    const genreNameParam = urlParams.get("genreName");

    // Apply filters from URL parameters
    if (sortParam) {
      selectedSort = sortParam;
      const sortButton = document.querySelector("#sort-filter .dropdown-btn");
      if (sortButton && sortNameParam) {
        sortButton.textContent = decodeURIComponent(sortNameParam);
        sortButton.dataset.value = sortParam;
      }
    }

    if (genreParam) {
      selectedGenre = genreParam;
      const genreButton = document.querySelector("#genre-filter .dropdown-btn");
      if (genreButton && genreNameParam) {
        genreButton.textContent = decodeURIComponent(genreNameParam);
        genreButton.dataset.value = genreParam;
      }
    }

    // Load stories with applied filters
    await loadStories();

    // Thêm hàm để xử lý auto filter khi load trang
    const autoFilter = urlParams.get("autoFilter");
    if (autoFilter === "true" && genreParam && genreNameParam) {
      console.log("Auto filtering for genre:", genreNameParam);

      // Tìm dropdown thể loại
      const genreDropdown = document.querySelector(
        '.dropdown-filter[data-filter="genre"]'
      );
      if (genreDropdown) {
        // Cập nhật text hiển thị của dropdown
        const dropdownBtn = genreDropdown.querySelector(".dropdown-btn");
        if (dropdownBtn) {
          dropdownBtn.textContent = genreNameParam;
        }

        // Đánh dấu thể loại đã chọn trong dropdown
        const genreLinks = genreDropdown.querySelectorAll(
          ".dropdown-content a"
        );
        genreLinks.forEach((link) => {
          if (link.getAttribute("data-value") === genreParam) {
            link.classList.add("selected");
          } else {
            link.classList.remove("selected");
          }
        });

        // Lưu thể loại đã chọn
        localStorage.setItem(
          "selectedGenre",
          JSON.stringify({
            id: genreParam,
            name: genreNameParam,
          })
        );

        // Tự động click nút Apply Filter
        const applyFilterBtn = document.getElementById("apply-filters");
        if (applyFilterBtn) {
          applyFilterBtn.click();
        }
      }
    }

    // Load initial data
    loadTopStories();

    // Set up tab buttons
    const tabButtons = document.querySelectorAll(".tab-btn");
    tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        tabButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        currentTopStoriesTab = btn.dataset.period;
        loadTopStories(currentTopStoriesTab);
      });
    });
  } catch (error) {
    console.error("Error initializing stories page:", error);
  }
});

function initializeFilters() {
  // Initialize genre filter
  const genreLinks = document.querySelectorAll("#genre-dropdown-content a");
  genreLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const dropdown = e.target.closest(".dropdown-filter");
      const button = dropdown.querySelector(".dropdown-btn");

      // Handle "Tất cả" option
      if (e.target.dataset.id === "") {
        selectedGenre = null;
        button.textContent = "Thể loại truyện";
      } else {
        selectedGenre = e.target.dataset.id;
        button.textContent = e.target.textContent;
      }

      button.dataset.value = selectedGenre || "";
    });
  });

  // Initialize sort filter
  const sortLinks = document.querySelectorAll(
    "#sort-filter .dropdown-content a"
  );
  sortLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const dropdown = e.target.closest(".dropdown-filter");
      const button = dropdown.querySelector(".dropdown-btn");

      // Handle "Tất cả" option
      if (e.target.dataset.value === "") {
        selectedSort = null;
        button.textContent = "Xếp theo";
      } else {
        selectedSort = e.target.dataset.value;
        button.textContent = e.target.textContent;
      }

      button.dataset.value = selectedSort || "";
    });
  });

  // Initialize chapter filter
  const chapterLinks = document.querySelectorAll(
    "#chapter-filter .dropdown-content a"
  );
  chapterLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const dropdown = e.target.closest(".dropdown-filter");
      const button = dropdown.querySelector(".dropdown-btn");

      // Handle "Tất cả" option
      if (e.target.dataset.value === "") {
        selectedChapters = null;
        button.textContent = "Số chương";
      } else {
        selectedChapters = e.target.dataset.value;
        button.textContent = e.target.textContent;
      }

      button.dataset.value = selectedChapters || "";
    });
  });

  // Initialize status filter
  const statusLinks = document.querySelectorAll(
    "#status-filter .dropdown-content a"
  );
  statusLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const dropdown = e.target.closest(".dropdown-filter");
      const button = dropdown.querySelector(".dropdown-btn");

      // Handle "Tất cả" option
      if (e.target.dataset.value === "") {
        selectedStatus = null;
        button.textContent = "Trạng thái";
      } else {
        selectedStatus = e.target.dataset.value;
        button.textContent = e.target.textContent;
      }

      button.dataset.value = selectedStatus || "";
    });
  });

  // Add click handler for apply button
  const applyButton = document.getElementById("apply-filters");
  if (applyButton) {
    applyButton.addEventListener("click", async () => {
      await loadStories(1); // Reset to first page when applying filters
    });
  }
}

// Load genres from API
async function loadGenres() {
  try {
    const response = await fetch("/api/genres?limit=1000");
    const result = await response.json();

    // Check if response has the correct structure
    if (!result.success || !result.data || !Array.isArray(result.data.genres)) {
      throw new Error("Invalid genres data format");
    }

    const genres = result.data.genres;
    console.log("Loaded genres:", genres.length);

    // Populate genres grid
    const genresGrid = document.querySelector(".genres-grid");
    if (genresGrid) {
      genresGrid.innerHTML = "";

      genres.forEach((genre) => {
        const genreItem = document.createElement("div");
        genreItem.className = "genre-item";
        genreItem.textContent = genre.name;
        genreItem.addEventListener("click", () => {
          // Cập nhật dropdown thể loại trong phần lọc
          const genreButton = document.querySelector(
            "#genre-filter .dropdown-btn"
          );
          if (genreButton) {
            genreButton.textContent = genre.name;
            genreButton.dataset.value = genre._id;
            selectedGenre = genre._id;
          }

          // Tự động áp dụng bộ lọc
          const applyFilterBtn = document.getElementById("apply-filters");
          if (applyFilterBtn) {
            applyFilterBtn.click();
          }
        });
        genresGrid.appendChild(genreItem);
      });
    }

    // Populate filter dropdown
    const filterDropdown = document.getElementById("genre-dropdown-content");
    if (filterDropdown) {
      filterDropdown.innerHTML = "";

      // Add "Tất cả" option
      const allOption = document.createElement("a");
      allOption.href = "#";
      allOption.textContent = "Tất cả";
      allOption.dataset.id = "";
      allOption.addEventListener("click", (e) => {
        e.preventDefault();
        const button = e.target
          .closest(".dropdown-filter")
          .querySelector(".dropdown-btn");
        button.textContent = "Thể loại truyện";
        button.dataset.value = "";
        selectedGenre = null;
      });
      filterDropdown.appendChild(allOption);

      // Add genre options
      genres.forEach((genre) => {
        const link = document.createElement("a");
        link.href = "#";
        link.textContent = genre.name;
        link.dataset.id = genre._id;
        link.addEventListener("click", (e) => {
          e.preventDefault();
          const button = e.target
            .closest(".dropdown-filter")
            .querySelector(".dropdown-btn");
          button.textContent = genre.name;
          button.dataset.value = genre._id;
          selectedGenre = genre._id;
        });
        filterDropdown.appendChild(link);
      });
    }

    // Populate header dropdown
    const headerDropdown = document.getElementById("genre-dropdown");
    if (headerDropdown) {
      headerDropdown.innerHTML = "";

      genres.forEach((genre) => {
        const link = document.createElement("a");
        link.href = `stories.html?genre=${
          genre._id
        }&genreName=${encodeURIComponent(genre.name)}`;
        link.className = "dropdown-item";
        link.textContent = genre.name;
        headerDropdown.appendChild(link);
      });
    }

    // Check URL parameters for genre filter
    const urlParams = new URLSearchParams(window.location.search);
    const genreParam = urlParams.get("genre");
    const genreNameParam = urlParams.get("genreName");

    if (genreParam && genreNameParam) {
      const genreButton = document.querySelector("#genre-filter .dropdown-btn");
      if (genreButton) {
        genreButton.textContent = decodeURIComponent(genreNameParam);
        genreButton.dataset.value = genreParam;
        selectedGenre = genreParam;

        // Tự động áp dụng bộ lọc nếu có genre trong URL
        const applyFilterBtn = document.getElementById("apply-filters");
        if (applyFilterBtn) {
          applyFilterBtn.click();
        }
      }
    }
  } catch (error) {
    console.error("Error loading genres:", error);
    // Show error message in genres grid if available
    const genresGrid = document.querySelector(".genres-grid");
    if (genresGrid) {
      genresGrid.innerHTML =
        '<div class="error-message">Không thể tải danh sách thể loại</div>';
    }
  }
}

// Load stories with filters
async function loadStories(page = 1) {
  try {
    const storyGrid = document.getElementById("story-grid");
    if (!storyGrid) {
      console.error("Story grid element not found");
      return;
    }

    // Show loading state
    storyGrid.innerHTML = '<div class="loading">Đang tải...</div>';

    // Build filter query
    const params = new URLSearchParams();

    // Track active filters for message display
    const activeFilters = {
      genre: null,
      sort: null,
      chapters: null,
      status: null,
    };

    // Add selected filters to query
    if (selectedGenre) {
      console.log("Selected genre before query:", selectedGenre);
      const cleanGenreId = selectedGenre.trim();
      if (cleanGenreId) {
        try {
          // Validate MongoDB ObjectId format
          if (!/^[0-9a-fA-F]{24}$/.test(cleanGenreId)) {
            throw new Error("ID thể loại không hợp lệ");
          }
          params.append("genre", cleanGenreId);
          // Get genre name from dropdown button
          const genreButton = document
            .querySelector("#genre-dropdown-content")
            .closest(".dropdown-filter")
            .querySelector(".dropdown-btn");
          activeFilters.genre = genreButton.textContent;
        } catch (error) {
          console.error("Invalid genre ID:", error);
          throw new Error("ID thể loại không hợp lệ");
        }
      }
    }

    if (selectedSort) {
      if (selectedSort === "newest") {
        params.append("isNew", "true"); // Chỉ lấy truyện được đánh dấu là mới
        params.append("sort", "-createdAt"); // Sắp xếp theo thời gian tạo mới nhất
        activeFilters.sort = "Mới nhất";
      } else if (selectedSort === "hot") {
        // Chỉ lấy truyện được đánh dấu là hot
        params.append("isHot", "true");
        params.append("sort", "-updatedAt"); // Sắp xếp truyện hot theo thời gian cập nhật
        activeFilters.sort = "Hot";
      } else if (selectedSort === "completed") {
        params.append("status", "completed");
        activeFilters.sort = "Truyện full";
      }
    }

    if (selectedChapters) {
      const chapterCount = parseInt(selectedChapters.replace(/[^\d]/g, ""));
      if (!isNaN(chapterCount)) {
        params.append("chapterCount", `lt${chapterCount}`);
        activeFilters.chapters = `Dưới ${chapterCount} chương`;
      }
    }

    if (selectedStatus) {
      params.append("status", selectedStatus);
      const statusButton = document
        .querySelector("#status-filter")
        .querySelector(".dropdown-btn");
      activeFilters.status = statusButton.textContent;
    }

    // Add pagination parameters
    params.append("page", page);
    params.append("limit", "20");

    // Log the request URL and parameters for debugging
    console.log("Request URL:", `/api/stories?${params.toString()}`);
    console.log("Filter parameters:", activeFilters);

    // Fetch stories from API
    const response = await fetch(`/api/stories?${params.toString()}`);

    // Log the raw response for debugging
    console.log("Raw Response:", response);

    // Check if response is ok before parsing JSON
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`
      );
    }

    const result = await response.json();

    // Log the parsed result for debugging
    console.log("Parsed Result:", result);

    // Clear loading state
    storyGrid.innerHTML = "";

    // Check if result has required properties
    if (!result || !Array.isArray(result.stories)) {
      throw new Error("Invalid response format - missing stories array");
    }

    const stories = result.stories;
    const pagination = result.pagination;

    // Display stories or no results message
    if (stories.length === 0) {
      // Create message based on active filters
      const activeFiltersList = Object.entries(activeFilters)
        .filter(([_, value]) => value !== null)
        .map(([_, value]) => value);

      let message = "Không tìm thấy truyện";
      if (activeFiltersList.length > 0) {
        message += " với các tiêu chí: " + activeFiltersList.join(", ");
      }

      storyGrid.innerHTML = `
        <div class="no-stories">
          <p>${message}</p>
          <p>Vui lòng thử lại với các bộ lọc khác.</p>
        </div>`;
      return;
    }

    // Create and append story cards
    stories.forEach((story) => {
      const storyCard = createStoryCard(story);
      storyGrid.appendChild(storyCard);
    });

    // Handle pagination
    if (pagination) {
      const { currentPage, totalPages } = pagination;
      if (totalPages > 1) {
        updatePagination(currentPage, totalPages);
      }
    }
  } catch (error) {
    console.error("Error loading stories:", error);
    const storyGrid = document.getElementById("story-grid");
    if (storyGrid) {
      storyGrid.innerHTML = `
        <div class="error">
          <p>Có lỗi xảy ra khi tải danh sách truyện: ${error.message}</p>
          <p>Vui lòng thử lại sau hoặc liên hệ quản trị viên.</p>
        </div>`;
    }
  }
}

// Create story card element
function createStoryCard(story) {
  const card = document.createElement("div");
  card.className = "story-card";

  card.innerHTML = `
    <a href="story-detail.html?id=${story._id}" class="story-link">
      <div class="story-cover">
        <img src="${story.coverImage || "/images/default-cover.jpg"}" alt="${
    story.title
  }">
      </div>
      <div class="story-info">
        <h3 class="story-title">${story.title}</h3>
        <p class="story-rating">
          <span class="star-icon">★</span> 
          ${story.rating?.average || 0}/10
        </p>
        <div class="chapter-badge">
          <i class="fas fa-book"></i>
          ${story.chapterCount || 0} chương
        </div>
      </div>
    </a>
  `;

  return card;
}

// Update pagination
function updatePagination(currentPage, totalPages) {
  const pagination = document.getElementById("pagination");
  if (!pagination) return;

  let paginationHTML = "";

  // Previous page
  if (currentPage > 1) {
    paginationHTML += `<a href="#" data-page="${
      currentPage - 1
    }" class="page-link">Trước</a>`;
  }

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    if (i === currentPage) {
      paginationHTML += `<span class="current-page">${i}</span>`;
    } else {
      paginationHTML += `<a href="#" data-page="${i}" class="page-link">${i}</a>`;
    }
  }

  // Next page
  if (currentPage < totalPages) {
    paginationHTML += `<a href="#" data-page="${
      currentPage + 1
    }" class="page-link">Sau</a>`;
  }

  pagination.innerHTML = paginationHTML;

  // Add click handlers for pagination
  pagination.querySelectorAll(".page-link").forEach((link) => {
    link.addEventListener("click", async (e) => {
      e.preventDefault();
      const page = e.target.dataset.page;
      if (page) {
        await loadStories(page);
      }
    });
  });
}

// Top Stories functionality
async function loadTopStories(period = "day") {
  try {
    const response = await fetch(`/api/stories/hot?period=${period}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    if (data.success && data.stories) {
      const topStoriesList = document.querySelector(".top-stories-list");
      if (topStoriesList) {
        topStoriesList.innerHTML = "";

        data.stories.forEach((story, index) => {
          const storyItem = document.createElement("div");
          storyItem.className = "top-story-item";
          storyItem.innerHTML = `
            <div class="story-rank">${index + 1}</div>
            <div class="top-story-info">
              <h4>${story.title}</h4>
              <div class="views-count">
                <i class="fas fa-eye"></i>
                ${story.views.toLocaleString()}
              </div>
            </div>
          `;
          storyItem.addEventListener("click", () => {
            window.location.href = `story-detail.html?id=${story._id}`;
          });
          topStoriesList.appendChild(storyItem);
        });
      }
    }
  } catch (error) {
    console.error("Error loading top stories:", error);
    const topStoriesList = document.querySelector(".top-stories-list");
    if (topStoriesList) {
      topStoriesList.innerHTML =
        '<div class="error-message">Không thể tải danh sách truyện hot</div>';
    }
  }
}
