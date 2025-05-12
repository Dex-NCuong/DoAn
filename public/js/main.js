// Main JavaScript functionality for all pages
document.addEventListener("DOMContentLoaded", function () {
  console.log("Main JS loaded successfully");

  // Initialize mobile menu
  initMobileMenu();

  // Initialize search functionality
  initSearch();
  initSearchSuggestions();
});

// Mobile menu functionality
function initMobileMenu() {
  const mobileMenuBtn = document.querySelector(".mobile-menu-btn");
  const mainNav = document.querySelector(".main-nav");

  if (mobileMenuBtn && mainNav) {
    mobileMenuBtn.addEventListener("click", function () {
      mainNav.classList.toggle("active");
      this.classList.toggle("active");
    });
  }
}

// Search functionality
function initSearch() {
  const searchForm = document.querySelector(".search-form");

  if (searchForm) {
    searchForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const searchInput = this.querySelector('input[type="search"]');

      if (searchInput && searchInput.value.trim()) {
        window.location.href = `/stories?search=${encodeURIComponent(
          searchInput.value.trim()
        )}`;
      }
    });
  }
}

// Initialize search suggestions
function initSearchSuggestions() {
  const searchInput = document.querySelector(".search-input");
  const searchForm = document.querySelector(".search-form");
  console.log("Initializing search suggestions...");
  console.log("Search input found:", !!searchInput);
  console.log("Search form found:", !!searchForm);

  if (searchInput && searchForm) {
    let suggestionsContainer = document.createElement("div");
    suggestionsContainer.className = "search-suggestions";
    searchForm.appendChild(suggestionsContainer);

    let selectedIndex = -1;
    let suggestions = [];

    searchInput.addEventListener(
      "input",
      debounce(async (e) => {
        const query = e.target.value.trim();
        console.log("Search query:", query);

        if (query.length < 2) {
          suggestionsContainer.classList.remove("active");
          suggestions = [];
          return;
        }

        try {
          const response = await fetch(
            `/api/stories/search-suggestions?q=${encodeURIComponent(query)}`
          );
          const data = await response.json();
          console.log("API response:", data);

          if (data.success) {
            suggestions = data.suggestions || [];
            console.log("Received suggestions:", suggestions);
            renderSuggestions();
          }
        } catch (err) {
          console.error("Error fetching suggestions:", err);
        }
      }, 300)
    );

    function renderSuggestions() {
      if (suggestions.length === 0) {
        suggestionsContainer.classList.remove("active");
        return;
      }

      suggestionsContainer.innerHTML = suggestions
        .map(
          (story, index) => `
          <div class="suggestion-item ${
            index === selectedIndex ? "selected" : ""
          }" 
               data-index="${index}"
               data-url="${story.id}">
            ${story.title}
          </div>
        `
        )
        .join("");

      suggestionsContainer.classList.add("active");
      console.log(
        "Rendered suggestions container:",
        suggestionsContainer.innerHTML
      );

      // Add click handlers
      const items = suggestionsContainer.querySelectorAll(".suggestion-item");
      items.forEach((item) => {
        item.addEventListener("click", () => {
          const storyId = item.dataset.url;
          window.location.href = `/story-detail.html?id=${storyId}`;
        });
      });
    }

    // Handle keyboard navigation
    searchInput.addEventListener("keydown", (e) => {
      if (!suggestionsContainer.classList.contains("active")) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
          renderSuggestions();
          break;
        case "ArrowUp":
          e.preventDefault();
          selectedIndex = Math.max(selectedIndex - 1, -1);
          renderSuggestions();
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0) {
            const selected = suggestionsContainer.querySelector(
              ".suggestion-item.selected"
            );
            if (selected) {
              const storyId = selected.dataset.url;
              window.location.href = `/story-detail.html?id=${storyId}`;
            }
          }
          break;
        case "Escape":
          suggestionsContainer.classList.remove("active");
          selectedIndex = -1;
          break;
      }
    });

    // Close suggestions when clicking outside
    document.addEventListener("click", (e) => {
      if (!searchForm.contains(e.target)) {
        suggestionsContainer.classList.remove("active");
        selectedIndex = -1;
      }
    });
  }
}

// Debounce helper function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Export functions for use in other files
window.initSearchSuggestions = initSearchSuggestions;
