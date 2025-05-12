class StarRating {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      totalStars: 10,
      initialRating: 0,
      totalVotes: 0,
      averageRating: 0,
      ...options,
    };

    this.ratingTexts = {
      1: "Không còn gì để nói",
      2: "Có chắc là truyện ?",
      3: "Cái quái gì vậy",
      4: "Tệ",
      5: "Tạm",
      6: "Cũng được",
      7: "Khá",
      8: "Quá được",
      9: "Hay",
      10: "Tuyệt đỉnh",
    };

    this.currentRating = 0;
    this.init();
  }

  init() {
    this.render();
    this.setupEventListeners();
    this.updateStats();
  }

  render() {
    this.container.classList.add("rating-container");

    const starsContainer = document.createElement("div");
    starsContainer.classList.add("stars-container");

    const stars = document.createElement("div");
    stars.classList.add("stars");

    for (let i = 1; i <= this.options.totalStars; i++) {
      const star = document.createElement("span");
      star.classList.add("star");
      star.innerHTML = "★";
      star.dataset.value = i;
      stars.appendChild(star);
    }

    const tooltip = document.createElement("div");
    tooltip.classList.add("rating-tooltip");
    stars.appendChild(tooltip);

    starsContainer.appendChild(stars);
    this.container.appendChild(starsContainer);

    const statsElement = document.createElement("div");
    statsElement.classList.add("rating-stats");
    this.container.appendChild(statsElement);

    this.stars = stars;
    this.tooltip = tooltip;
    this.statsElement = statsElement;

    this.updateStars(this.options.averageRating);
  }

  setupEventListeners() {
    this.stars.addEventListener("mouseover", (e) => {
      const star = e.target.closest(".star");
      if (!star) return;

      const value = parseInt(star.dataset.value);
      this.updateStars(value, true);
      this.updateTooltip(value);
    });

    this.stars.addEventListener("mouseleave", () => {
      this.updateStars(this.options.averageRating);
      this.tooltip.style.opacity = "0";
      this.tooltip.style.visibility = "hidden";
    });

    this.stars.addEventListener("click", async (e) => {
      const star = e.target.closest(".star");
      if (!star) return;

      const value = parseInt(star.dataset.value);
      await this.submitRating(value);
    });
  }

  updateStars(rating, isHover = false) {
    const stars = this.stars.querySelectorAll(".star");
    stars.forEach((star, index) => {
      star.classList.remove("active", "hover");
      if (index < rating) {
        star.classList.add(isHover ? "hover" : "active");
      }
    });
  }

  updateTooltip(value) {
    this.tooltip.textContent = this.ratingTexts[value] || "";
    this.tooltip.style.opacity = "1";
    this.tooltip.style.visibility = "visible";
  }

  updateStats() {
    this.statsElement.textContent = `Đánh giá: ${this.options.averageRating.toFixed(
      1
    )}/10 từ ${this.options.totalVotes} lượt`;
  }

  async submitRating(value) {
    try {
      const response = await fetch(
        `/api/stories/${this.options.storyId}/rate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ rating: value }),
        }
      );

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();

      if (data.success) {
        this.options.totalVotes = data.totalVotes;
        this.options.averageRating = data.averageRating;
        this.updateStats();
        this.updateStars(this.options.averageRating);
        alert("Cảm ơn bạn đã đánh giá!");
      } else {
        throw new Error(data.message || "Có lỗi xảy ra");
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
      alert("Có lỗi xảy ra khi đánh giá. Vui lòng thử lại sau.");
    }
  }
}
