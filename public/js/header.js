// Initialize search functionality
function initializeSearch() {
  const searchInput = document.querySelector(".search-input");
  const searchButton = document.querySelector(".search-button");

  if (!searchInput || !searchButton) {
    return; // Silently return if elements don't exist
  }

  searchButton.addEventListener("click", (e) => {
    e.preventDefault();
    performSearch();
  });

  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      performSearch();
    }
  });
}

function performSearch() {
  const searchInput = document.querySelector(".search-input");
  const searchTerm = searchInput.value.trim();

  if (searchTerm) {
    window.location.href = `/search?q=${encodeURIComponent(searchTerm)}`;
  }
}

// Load header content
async function loadHeader() {
  // Check if header already exists to prevent double loading
  const existingHeader = document.querySelector("header");
  if (existingHeader) {
    console.log("Header already exists, skipping load");
    return;
  }

  try {
    console.log("Loading header...");
    const response = await fetch("/header.html");
    if (!response.ok) {
      throw new Error(`Failed to fetch header: ${response.statusText}`);
    }
    const headerContent = await response.text();

    // Insert header content at the beginning of the body
    document.body.insertAdjacentHTML("afterbegin", headerContent);
    console.log("Header loaded successfully");

    // Initialize search
    initializeSearch();

    // Initialize search suggestions
    if (typeof window.initSearchSuggestions === "function") {
      window.initSearchSuggestions();
    }

    // Load genres
    await loadGenres();

    // Add event listeners for dropdowns
    const dropdownToggles = document.querySelectorAll(".dropdown-toggle");
    dropdownToggles.forEach((toggle) => {
      toggle.addEventListener("click", (e) => {
        if (e.currentTarget.getAttribute("href") === "#") {
          e.preventDefault();
        }
      });
    });

    // Update auth UI
    if (typeof updateAuthUI === "function") {
      console.log("Calling updateAuthUI after loading header.");
      updateAuthUI();
    }
  } catch (error) {
    console.error("Error loading header:", error);
  }
}

// Load genres into dropdown
async function loadGenres() {
  try {
    // Request all genres by setting a large limit
    const response = await fetch("/api/genres?limit=1000");
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Failed to load genres");
    }

    const genres = data.data.genres;
    if (!Array.isArray(genres)) {
      throw new Error("Invalid genres data format");
    }

    const genreDropdown = document.getElementById("genre-dropdown");
    if (!genreDropdown) {
      console.error("Genre dropdown element not found");
      return;
    }

    // Clear existing items
    genreDropdown.innerHTML = "";

    // Sort genres alphabetically
    const sortedGenres = genres.sort((a, b) => a.name.localeCompare(b.name));

    if (sortedGenres.length === 0) {
      const emptyItem = document.createElement("a");
      emptyItem.className = "dropdown-item";
      emptyItem.textContent = "Không có thể loại nào";
      genreDropdown.appendChild(emptyItem);
      return;
    }

    // Add genres to dropdown with URL parameters
    sortedGenres.forEach((genre) => {
      const link = document.createElement("a");
      link.href = `stories.html?genre=${
        genre._id
      }&genreName=${encodeURIComponent(genre.name)}`;
      link.className = "dropdown-item";
      link.textContent = `${genre.name}`;
      genreDropdown.appendChild(link);
    });

    // Update the list links in the header
    const listDropdown = document.querySelector(".dropdown-content");
    if (listDropdown) {
      const listLinks = listDropdown.querySelectorAll("a");
      listLinks.forEach((link) => {
        if (link.textContent === "Truyện mới") {
          link.href = "stories.html?sort=newest&sortName=Truyện mới";
        } else if (link.textContent === "Truyện hot") {
          link.href = "stories.html?sort=hot&sortName=Truyện hot";
        } else if (link.textContent === "Truyện full") {
          link.href = "stories.html?sort=completed&sortName=Truyện full";
        }
      });
    }
  } catch (error) {
    console.error("Error loading genres:", error);
    const genreDropdown = document.getElementById("genre-dropdown");
    if (genreDropdown) {
      genreDropdown.innerHTML = '<a class="dropdown-item">Lỗi tải thể loại</a>';
    }
  }
}

// Initialize when document is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadHeader);
} else {
  loadHeader();
}
