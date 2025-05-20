// Load and handle genres
document.addEventListener("DOMContentLoaded", function () {
  loadGenres();
});

// Function to load genres from API
async function loadGenres() {
  try {
    const response = await fetch("/api/genres");
    const genres = await response.json();

    // Add genres to navigation if genre dropdown exists
    const genreDropdown = document.getElementById("genre-dropdown");
    if (genreDropdown) {
      if (genres && genres.length > 0) {
        let html = "";
        genres.forEach((genre) => {
          html += `<a href="stories.html?genre=${genre._id}">${genre.name}</a>`;
        });
        genreDropdown.innerHTML = html;
      } else {
        genreDropdown.innerHTML = "<p>Không có thể loại.</p>";
      }
    }
  } catch (error) {
    console.error("Error loading genres:", error);
    const genreDropdown = document.getElementById("genre-dropdown");
    if (genreDropdown) {
      genreDropdown.innerHTML = '<p class="error">Lỗi khi tải thể loại.</p>';
    }
  }
}

// Function to get genre name by ID
async function getGenreName(genreId) {
  try {
    const response = await fetch(`/api/genres/${genreId}`);
    const genre = await response.json();
    return genre.name;
  } catch (error) {
    console.error("Error getting genre name:", error);
    return "Unknown Genre";
  }
}

// Function to format genre list
function formatGenres(genres) {
  if (!genres || genres.length === 0) return "";
  return genres
    .map((genre) => (typeof genre === "object" ? genre.name : genre))
    .join(", ");
}
