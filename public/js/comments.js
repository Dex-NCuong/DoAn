// Khởi tạo các biến trong namespace Comments để tránh xung đột
const Comments = {
  page: 1,
  perPage: 6,
  total: 0,
  sort: "newest",
};

// Move these variables to the global scope
let commentInput = null;
let commentFormActions = null;
let postButton = null;
let cancelButton = null;

// Khởi tạo khi trang được load
document.addEventListener("DOMContentLoaded", async () => {
  // Kiểm tra đăng nhập và cập nhật UI
  await updateCommentUIBasedOnAuth();

  // Load comments ban đầu
  await loadComments(true);

  // Xử lý sự kiện sort
  const sortSelect = document.getElementById("comment-sort");
  if (sortSelect) {
    sortSelect.addEventListener("change", async (e) => {
      Comments.sort = e.target.value;
      Comments.page = 1;
      await loadComments(true);
    });
  }

  // Initialize comment form elements
  commentInput = document.querySelector("#comment-input");
  commentFormActions = document.querySelector(".comment-form-actions");
  postButton = document.querySelector(".post-btn");
  cancelButton = document.querySelector(".cancel-btn");

  // Set up comment form interaction
  if (commentInput && commentFormActions) {
    // Ensure actions are hidden initially
    commentFormActions.style.display = "none";

    // Show actions on focus
    commentInput.addEventListener("focus", () => {
      showActions();
    });

    // Show/hide actions and update post button state on input
    commentInput.addEventListener("input", () => {
      showActions();
      if (postButton) {
        postButton.disabled = !commentInput.value.trim();
      }
    });

    // Handle cancel button
    if (cancelButton) {
      cancelButton.addEventListener("click", () => {
        commentInput.value = "";
        hideActions();
        commentInput.blur(); // Remove focus from input
      });
    }

    // Handle post button
    if (postButton) {
      postButton.addEventListener("click", async () => {
        if (!commentInput.value.trim()) return;
        try {
          await postComment();
          commentInput.value = "";
          hideActions();
          commentInput.blur(); // Remove focus from input
        } catch (error) {
          console.error("Error posting comment:", error);
          alert("Có lỗi xảy ra khi đăng bình luận. Vui lòng thử lại.");
        }
      });
    }

    // Handle click outside
    document.addEventListener("click", (e) => {
      // Kiểm tra xem click có phải là bên ngoài form không
      if (
        !e.target.closest(".comment-form") &&
        !e.target.closest(".comment-form-actions") &&
        commentInput.value.trim() === ""
      ) {
        hideActions();
      }
    });
  }
});

// Cập nhật UI dựa trên trạng thái đăng nhập
async function updateCommentUIBasedOnAuth() {
  const token = localStorage.getItem("auth_token");
  const commentForm = document.getElementById("main-comment-form");
  const commentInput = document.getElementById("comment-input");
  const userAvatar = document.getElementById("current-user-avatar");

  if (!token) {
    commentInput.placeholder = "Vui lòng đăng nhập để bình luận";
    commentInput.disabled = true;
    return;
  }

  try {
    const response = await fetch("/api/users/profile", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error("Failed to fetch user profile");

    const userData = await response.json();
    userAvatar.src = userData.avatar || "/images/default-avatar.png";
    commentInput.placeholder = "Viết bình luận...";
    commentInput.disabled = false;
  } catch (error) {
    console.error("Error fetching user profile:", error);
  }
}

// Hàm tính tổng số bình luận và phản hồi
function calculateTotalComments(comments) {
  // Đếm tất cả các bình luận gốc, bao gồm cả những bình luận bị ẩn
  return Comments.total;
}

// Load comments
async function loadComments(reset = false) {
  const storyId = getStoryIdFromUrl();
  if (!storyId) return;

  try {
    const response = await fetch(
      `/api/comments/${storyId}?page=${Comments.page}&limit=${Comments.perPage}&sort=${Comments.sort}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      }
    );
    if (!response.ok) throw new Error("Failed to fetch comments");

    const data = await response.json();
    Comments.total = data.total;

    // Cập nhật số lượng bình luận (tất cả bình luận gốc)
    const totalComments = calculateTotalComments(data.comments);
    document.getElementById("total-comments").textContent = totalComments;

    // Render comments
    const commentList = document.getElementById("comment-list");
    if (!commentList) return;

    if (reset) {
      commentList.innerHTML = "";
      Comments.page = 1;
    }

    // Thêm comments mới và xử lý replies
    data.comments.forEach((comment, index) => {
      const commentElement = createCommentElement(comment);

      // Xử lý replies
      if (comment.replies && comment.replies.length > 0) {
        const repliesContainer =
          commentElement.querySelector(".replies-container");
        const nestedReplies = new Map(); // Lưu trữ các nested replies theo parent ID
        const directReplies = []; // Lưu trữ các replies trực tiếp

        // Phân loại replies
        comment.replies.forEach((reply) => {
          if (reply.replyToReply) {
            if (!nestedReplies.has(reply.replyToReply)) {
              nestedReplies.set(reply.replyToReply, []);
            }
            nestedReplies.get(reply.replyToReply).push(reply);
          } else {
            directReplies.push(reply);
          }
        });

        // Xử lý direct replies trước
        directReplies.forEach((reply) => {
          reply.nestedReplies = nestedReplies.get(reply._id) || [];
          const replyElement = createReplyElement(reply);
          repliesContainer.appendChild(replyElement);

          // Hiển thị nested replies nếu có
          if (nestedReplies.has(reply._id)) {
            const nestedRepliesContainer = replyElement.querySelector(
              ".nested-replies-container"
            );
            if (nestedRepliesContainer) {
              nestedReplies.get(reply._id).forEach((nestedReply) => {
                const nestedReplyElement = createReplyElement({
                  ...nestedReply,
                  replyToReply: reply._id,
                });
                nestedRepliesContainer.appendChild(nestedReplyElement);
              });
            }
          }
        });

        // Mặc định ẩn replies container và cập nhật nút toggle
        if (directReplies.length > 0) {
          repliesContainer.style.display = "none";
          const toggleRepliesBtn = commentElement.querySelector(
            ".toggle-replies-btn"
          );
          if (toggleRepliesBtn) {
            toggleRepliesBtn.innerHTML = `<i class="fas fa-comment-dots"></i> Xem ${directReplies.length} phản hồi`;
          }
        }
      }

      // Thêm comment vào danh sách
      commentList.appendChild(commentElement);

      // Nếu đây là lần load đầu tiên (reset = true), ẩn các comment cũ hơn 6 comment đầu tiên
      if (reset && index >= Comments.perPage) {
        commentElement.style.display = "none";
      }
    });

    // Thiết lập nút "Tải thêm bình luận"
    setupLoadMoreButton();
  } catch (error) {
    console.error("Error loading comments:", error);
    alert("Có lỗi xảy ra khi tải bình luận. Vui lòng thử lại.");
  }
}

// Hàm thiết lập nút "Tải thêm bình luận"
function setupLoadMoreButton() {
  const loadMoreBtn = document.getElementById("load-more-comments");
  if (!loadMoreBtn) return;

  const commentList = document.getElementById("comment-list");
  if (!commentList) return;

  // Xóa tất cả event listener cũ
  const newLoadMoreBtn = loadMoreBtn.cloneNode(true);
  loadMoreBtn.parentNode.replaceChild(newLoadMoreBtn, loadMoreBtn);

  // Thêm event listener mới
  newLoadMoreBtn.addEventListener("click", async function () {
    // Lấy tất cả các comment items
    const allComments = Array.from(
      commentList.querySelectorAll(".comment-item")
    );

    // Lọc ra các comment đang bị ẩn
    const hiddenComments = allComments.filter((comment) => {
      return comment.style.display === "none";
    });

    // Log để debug
    console.log("Tổng số comments:", Comments.total);
    console.log(
      "Comments hiển thị:",
      allComments.length - hiddenComments.length
    );
    console.log("Comments đang ẩn:", hiddenComments.length);
    console.log(
      "Comments cần hiển thị thêm:",
      Comments.total - allComments.length + hiddenComments.length
    );

    // Nếu có comments ẩn, hiển thị chúng
    if (hiddenComments.length > 0) {
      const commentsToShow = hiddenComments.slice(0, Comments.perPage);
      commentsToShow.forEach((comment) => {
        comment.style.display = "block";

        // Thêm event listener cho nút toggle replies
        const toggleRepliesBtn = comment.querySelector(".toggle-replies-btn");
        const repliesContainer = comment.querySelector(".replies-container");

        if (toggleRepliesBtn && repliesContainer) {
          toggleRepliesBtn.addEventListener("click", () => {
            const isHidden = repliesContainer.style.display === "none";
            repliesContainer.style.display = isHidden ? "block" : "none";
            const repliesCount = repliesContainer.children.length;
            toggleRepliesBtn.innerHTML = isHidden
              ? `<i class="fas fa-comment-dots"></i> Ẩn ${repliesCount} phản hồi`
              : `<i class="fas fa-comment-dots"></i> Xem ${repliesCount} phản hồi`;
          });
        }
      });
    }
    // Nếu không có comments ẩn nhưng vẫn còn comments chưa tải
    else if (allComments.length < Comments.total) {
      Comments.page += 1;
      try {
        const storyId = getStoryIdFromUrl();
        const response = await fetch(
          `/api/comments/${storyId}?page=${Comments.page}&limit=${Comments.perPage}&sort=${Comments.sort}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            },
          }
        );

        if (!response.ok) throw new Error("Failed to fetch comments");

        const data = await response.json();

        // Thêm comments mới
        data.comments.forEach((comment) => {
          const commentElement = createCommentElement(comment);

          // Xử lý replies cho comment mới
          if (comment.replies && comment.replies.length > 0) {
            const repliesContainer =
              commentElement.querySelector(".replies-container");
            const nestedReplies = new Map();
            const directReplies = [];

            // Phân loại replies
            comment.replies.forEach((reply) => {
              if (reply.replyToReply) {
                if (!nestedReplies.has(reply.replyToReply)) {
                  nestedReplies.set(reply.replyToReply, []);
                }
                nestedReplies.get(reply.replyToReply).push(reply);
              } else {
                directReplies.push(reply);
              }
            });

            // Xử lý direct replies
            directReplies.forEach((reply) => {
              reply.nestedReplies = nestedReplies.get(reply._id) || [];
              const replyElement = createReplyElement(reply);
              repliesContainer.appendChild(replyElement);

              // Xử lý nested replies
              if (nestedReplies.has(reply._id)) {
                const nestedRepliesContainer = replyElement.querySelector(
                  ".nested-replies-container"
                );
                if (nestedRepliesContainer) {
                  nestedReplies.get(reply._id).forEach((nestedReply) => {
                    const nestedReplyElement = createReplyElement({
                      ...nestedReply,
                      replyToReply: reply._id,
                    });
                    nestedRepliesContainer.appendChild(nestedReplyElement);
                  });
                }
              }
            });

            // Cập nhật nút toggle và thêm event listener
            if (directReplies.length > 0) {
              const toggleRepliesBtn = commentElement.querySelector(
                ".toggle-replies-btn"
              );
              if (toggleRepliesBtn) {
                toggleRepliesBtn.innerHTML = `<i class="fas fa-comment-dots"></i> Xem ${directReplies.length} phản hồi`;

                // Thêm event listener cho nút toggle
                toggleRepliesBtn.addEventListener("click", () => {
                  const isHidden = repliesContainer.style.display === "none";
                  repliesContainer.style.display = isHidden ? "block" : "none";
                  toggleRepliesBtn.innerHTML = isHidden
                    ? `<i class="fas fa-comment-dots"></i> Ẩn ${directReplies.length} phản hồi`
                    : `<i class="fas fa-comment-dots"></i> Xem ${directReplies.length} phản hồi`;
                });
              }
            }
          }

          commentList.appendChild(commentElement);

          // Thêm event listener cho nút toggle replies của comment mới
          const toggleRepliesBtn = commentElement.querySelector(
            ".toggle-replies-btn"
          );
          const repliesContainer =
            commentElement.querySelector(".replies-container");

          if (toggleRepliesBtn && repliesContainer) {
            toggleRepliesBtn.addEventListener("click", () => {
              const isHidden = repliesContainer.style.display === "none";
              repliesContainer.style.display = isHidden ? "block" : "none";
              const repliesCount = repliesContainer.children.length;
              toggleRepliesBtn.innerHTML = isHidden
                ? `<i class="fas fa-comment-dots"></i> Ẩn ${repliesCount} phản hồi`
                : `<i class="fas fa-comment-dots"></i> Xem ${repliesCount} phản hồi`;
            });
          }
        });
      } catch (error) {
        console.error("Error loading more comments:", error);
        alert("Có lỗi xảy ra khi tải thêm bình luận. Vui lòng thử lại.");
      }
    }
    // Nếu không còn comments để tải và hiển thị
    else {
      alert("Không còn bình luận để tải");
      newLoadMoreBtn.style.display = "none";
    }
  });
}

// Hàm format thời gian
function formatTimeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - new Date(date)) / 1000);

  const intervals = {
    năm: 31536000,
    tháng: 2592000,
    tuần: 604800,
    ngày: 86400,
    giờ: 3600,
    phút: 60,
  };

  for (let [unit, seconds] of Object.entries(intervals)) {
    const interval = Math.floor(diffInSeconds / seconds);
    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 && unit !== "giờ" ? "" : ""}`;
    }
  }
  return "Vừa xong";
}

// Tạo element cho một comment
function createCommentElement(comment) {
  const commentDiv = document.createElement("div");
  commentDiv.className = "comment-item";
  commentDiv.dataset.commentId = comment._id;

  const userAvatar = comment.user.avatar || "/images/default-avatar.png";
  const timeAgo = formatTimeAgo(comment.createdAt);
  const hasReplies = comment.replies && comment.replies.length > 0;
  const repliesCount = hasReplies
    ? comment.replies.filter((r) => !r.replyToReply).length
    : 0;
  const isLiked = Boolean(comment.isLiked);
  const likeCount = comment.likes?.length || 0;

  commentDiv.innerHTML = `
    <div class="comment-container">
      <div class="comment-avatar">
        <img src="${userAvatar}" alt="User avatar" class="user-avatar">
      </div>
      <div class="comment-content-wrapper">
        <div class="comment-header">
          <span class="username">${comment.user.username}</span>
        </div>
        <div class="comment-text">
          ${comment.content}
        </div>
        <div class="comment-actions">
          <button class="action-btn like-btn ${
            isLiked ? "liked" : ""
          }" data-comment-id="${comment._id}" data-is-liked="${isLiked}">
            <i class="fas fa-heart"></i> Thích ${
              likeCount > 0 ? `(${likeCount})` : ""
            }
          </button>
          <button class="action-btn reply-btn">
            <i class="fas fa-reply"></i> Phản hồi
          </button>
          <span class="comment-time">${timeAgo}</span>
        </div>
        <div class="reply-form" style="display: none;">
          <textarea placeholder="Viết câu trả lời..." class="reply-input"></textarea>
          <div class="reply-form-actions">
            <button class="cancel-reply">Hủy</button>
            <button class="submit-reply">Gửi</button>
          </div>
        </div>
        ${
          hasReplies && repliesCount > 0
            ? `
        <div class="view-replies">
          <button class="toggle-replies-btn">
            <i class="fas fa-comment-dots"></i> Xem ${repliesCount} phản hồi
          </button>
        </div>`
            : ""
        }
        <div class="replies-container" style="display: none;"></div>
      </div>
    </div>
  `;

  // Thêm event listeners
  const likeBtn = commentDiv.querySelector(".like-btn");
  const replyBtn = commentDiv.querySelector(".reply-btn");
  const submitReplyBtn = commentDiv.querySelector(".submit-reply");
  const cancelReplyBtn = commentDiv.querySelector(".cancel-reply");
  const toggleRepliesBtn = commentDiv.querySelector(".toggle-replies-btn");
  const repliesContainer = commentDiv.querySelector(".replies-container");
  const replyForm = commentDiv.querySelector(".reply-form");

  // Xử lý sự kiện like
  likeBtn?.addEventListener("click", async () => {
    await handleLike(comment._id);
  });

  // Xử lý sự kiện hiển thị form trả lời
  replyBtn?.addEventListener("click", () => {
    replyForm.style.display = "block";
    const textarea = replyForm.querySelector("textarea");
    textarea?.focus();
  });

  // Xử lý sự kiện hủy trả lời
  cancelReplyBtn?.addEventListener("click", () => {
    replyForm.style.display = "none";
    replyForm.querySelector("textarea").value = "";
  });

  // Xử lý sự kiện gửi trả lời
  submitReplyBtn?.addEventListener("click", async () => {
    const content = replyForm.querySelector("textarea").value.trim();
    if (content) {
      await submitReply(comment._id, content);
    }
  });

  // Xử lý sự kiện hiển thị/ẩn phản hồi
  if (hasReplies && toggleRepliesBtn) {
    toggleRepliesBtn.addEventListener("click", () => {
      const isHidden = repliesContainer.style.display === "none";
      repliesContainer.style.display = isHidden ? "block" : "none";
      toggleRepliesBtn.innerHTML = isHidden
        ? `<i class="fas fa-comment-dots"></i> Ẩn ${repliesCount} phản hồi`
        : `<i class="fas fa-comment-dots"></i> Xem ${repliesCount} phản hồi`;
    });
  }

  return commentDiv;
}

// Tạo element cho một reply
function createReplyElement(reply) {
  const replyDiv = document.createElement("div");
  replyDiv.className = "reply-item";
  replyDiv.dataset.replyId = reply._id;

  const userAvatar = reply.user.avatar || "/images/default-avatar.png";
  const timeAgo = formatTimeAgo(reply.createdAt);
  const isLiked = Boolean(reply.isLiked);
  const likeCount = reply.likes?.length || 0;

  // Kiểm tra xem reply này có phải là nested reply không
  const isNestedReply = reply.replyToReply != null;

  // Nếu là nested reply, thêm class nested-reply-item
  if (isNestedReply) {
    replyDiv.className = "nested-reply-item";
  }

  // Kiểm tra số lượng nested replies
  const hasNestedReplies =
    reply.nestedReplies && reply.nestedReplies.length > 0;
  const nestedRepliesCount = hasNestedReplies ? reply.nestedReplies.length : 0;

  replyDiv.innerHTML = `
    <div class="comment-container">
      <div class="comment-avatar">
        <img src="${userAvatar}" alt="User avatar" class="user-avatar">
      </div>
      <div class="comment-content-wrapper">
        <div class="comment-header">
          <span class="username">${reply.user.username}</span>
        </div>
        <div class="comment-text">
          ${reply.content}
        </div>
        <div class="comment-actions">
          <button class="action-btn like-btn ${
            isLiked ? "liked" : ""
          }" data-reply-id="${reply._id}" data-is-liked="${isLiked}">
            <i class="fas fa-heart"></i> Thích ${
              likeCount > 0 ? `(${likeCount})` : ""
            }
          </button>
          ${
            !isNestedReply
              ? `
          <button class="action-btn reply-btn">
            <i class="fas fa-reply"></i> Phản hồi
          </button>
          `
              : ""
          }
          <span class="comment-time">${timeAgo}</span>
        </div>
        ${
          !isNestedReply
            ? `
          <div class="reply-form" style="display: none;">
            <textarea placeholder="Viết câu trả lời..." class="reply-input"></textarea>
            <div class="reply-form-actions">
              <button class="cancel-reply">Hủy</button>
              <button class="submit-reply">Gửi</button>
            </div>
          </div>
          `
            : ""
        }
        ${
          !isNestedReply && hasNestedReplies
            ? `
          <div class="view-replies">
            <button class="toggle-replies-btn">
              <i class="fas fa-comment-dots"></i> Xem ${nestedRepliesCount} phản hồi
            </button>
          </div>
          `
            : ""
        }
        ${
          !isNestedReply
            ? '<div class="nested-replies-container" style="display: none;"></div>'
            : ""
        }
      </div>
    </div>
  `;

  // Thêm event listener cho nút like của reply
  const likeBtn = replyDiv.querySelector(".like-btn");
  likeBtn?.addEventListener("click", () => handleLike(reply._id, true));

  // Chỉ thêm các event listeners cho reply form nếu không phải là nested reply
  if (!isNestedReply) {
    const replyBtn = replyDiv.querySelector(".reply-btn");
    const replyForm = replyDiv.querySelector(".reply-form");
    const submitReplyBtn = replyDiv.querySelector(".submit-reply");
    const cancelReplyBtn = replyDiv.querySelector(".cancel-reply");
    const nestedRepliesContainer = replyDiv.querySelector(
      ".nested-replies-container"
    );
    const toggleRepliesBtn = replyDiv.querySelector(".toggle-replies-btn");

    // Xử lý sự kiện hiển thị form trả lời
    replyBtn?.addEventListener("click", () => {
      replyForm.style.display = "block";
      const textarea = replyForm.querySelector("textarea");
      textarea?.focus();
    });

    // Xử lý sự kiện hủy trả lời
    cancelReplyBtn?.addEventListener("click", () => {
      replyForm.style.display = "none";
      replyForm.querySelector("textarea").value = "";
    });

    // Xử lý sự kiện gửi trả lời
    submitReplyBtn?.addEventListener("click", async () => {
      const content = replyForm.querySelector("textarea").value.trim();
      if (content) {
        try {
          const token = localStorage.getItem("auth_token");
          if (!token) {
            alert("Vui lòng đăng nhập để trả lời");
            return;
          }

          const response = await fetch(`/api/comments/${reply._id}/reply`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              content,
              replyToReply: reply._id,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(
              data.message || "Không thể gửi trả lời. Vui lòng thử lại."
            );
          }

          // Tạo nested reply mới với dữ liệu đầy đủ
          const nestedReplyData = {
            ...data,
            replyToReply: reply._id,
          };

          // Tạo và thêm nested reply mới
          const nestedReplyElement = createReplyElement(nestedReplyData);

          // Kiểm tra xem reply này đã tồn tại chưa
          const existingReply = nestedRepliesContainer.querySelector(
            `[data-reply-id="${data._id}"]`
          );
          if (!existingReply) {
            nestedRepliesContainer.appendChild(nestedReplyElement);
            nestedRepliesContainer.style.display = "block";

            // Cập nhật số lượng replies và nút toggle
            const currentReplies = nestedRepliesContainer.children.length;

            // Cập nhật hoặc tạo mới nút toggle
            let viewRepliesDiv = replyDiv.querySelector(".view-replies");
            let toggleBtn;

            if (!viewRepliesDiv) {
              // Tạo mới view-replies div và nút toggle
              viewRepliesDiv = document.createElement("div");
              viewRepliesDiv.className = "view-replies";
              toggleBtn = document.createElement("button");
              toggleBtn.className = "toggle-replies-btn";
              viewRepliesDiv.appendChild(toggleBtn);
              replyDiv
                .querySelector(".comment-content-wrapper")
                .insertBefore(viewRepliesDiv, nestedRepliesContainer);
            } else {
              toggleBtn = viewRepliesDiv.querySelector(".toggle-replies-btn");
            }

            // Cập nhật text cho nút toggle
            if (toggleBtn) {
              toggleBtn.innerHTML = `<i class="fas fa-comment-dots"></i> Ẩn ${currentReplies} phản hồi`;

              // Đảm bảo event listener chỉ được thêm một lần
              toggleBtn.replaceWith(toggleBtn.cloneNode(true));
              toggleBtn = viewRepliesDiv.querySelector(".toggle-replies-btn");

              toggleBtn.addEventListener("click", () => {
                const isHidden =
                  nestedRepliesContainer.style.display === "none";
                nestedRepliesContainer.style.display = isHidden
                  ? "block"
                  : "none";
                toggleBtn.innerHTML = isHidden
                  ? `<i class="fas fa-comment-dots"></i> Ẩn ${currentReplies} phản hồi`
                  : `<i class="fas fa-comment-dots"></i> Xem ${currentReplies} phản hồi`;
              });
            }
          }

          // Xóa nội dung form và ẩn form
          replyForm.querySelector("textarea").value = "";
          replyForm.style.display = "none";
        } catch (error) {
          console.error("Error submitting nested reply:", error);
          alert(
            error.message || "Có lỗi xảy ra khi gửi trả lời. Vui lòng thử lại."
          );
        }
      }
    });

    // Xử lý sự kiện ẩn/hiện nested replies
    if (hasNestedReplies && toggleRepliesBtn) {
      toggleRepliesBtn.addEventListener("click", () => {
        const isHidden = nestedRepliesContainer.style.display === "none";
        nestedRepliesContainer.style.display = isHidden ? "block" : "none";
        toggleRepliesBtn.innerHTML = isHidden
          ? `<i class="fas fa-comment-dots"></i> Ẩn ${nestedRepliesCount} phản hồi`
          : `<i class="fas fa-comment-dots"></i> Xem ${nestedRepliesCount} phản hồi`;
      });
    }
  }

  return replyDiv;
}

// Đăng comment mới
async function postComment() {
  const token = localStorage.getItem("auth_token");
  if (!token) {
    alert("Vui lòng đăng nhập để bình luận");
    return;
  }

  const commentInput = document.getElementById("comment-input");
  if (!commentInput) {
    console.error("Comment input element not found");
    return;
  }

  const content = commentInput.value.trim();
  if (!content) {
    alert("Vui lòng nhập nội dung bình luận");
    return;
  }

  const storyId = getStoryIdFromUrl();
  if (!storyId) {
    alert("Không tìm thấy thông tin truyện");
    return;
  }

  try {
    const response = await fetch(`/api/comments/${storyId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Không thể đăng bình luận. Vui lòng thử lại."
      );
    }

    // Clear input và reload comments
    commentInput.value = "";
    Comments.page = 1;
    await loadComments(true);
  } catch (error) {
    console.error("Error posting comment:", error);
    alert(
      error.message || "Có lỗi xảy ra khi đăng bình luận. Vui lòng thử lại."
    );
  }
}

// Lấy story ID từ URL
function getStoryIdFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("id");
}

// Lấy avatar của user hiện tại
function getCurrentUserAvatar() {
  const userAvatar = document.getElementById("current-user-avatar");
  return userAvatar ? userAvatar.src : "/images/default-avatar.png";
}

// Hiển thị form trả lời
function showReplyForm(commentId) {
  const commentElement = document.querySelector(
    `[data-comment-id="${commentId}"]`
  );
  const replyForm = commentElement.querySelector(".reply-form-container");
  replyForm.style.display = "block";
}

// Ẩn form trả lời
function hideReplyForm(commentId) {
  const commentElement = document.querySelector(
    `[data-comment-id="${commentId}"]`
  );
  const replyForm = commentElement.querySelector(".reply-form-container");
  replyForm.style.display = "none";
}

// Toggle hiển thị replies
function toggleReplies(commentId) {
  const commentElement = document.querySelector(
    `[data-comment-id="${commentId}"]`
  );
  const repliesContainer = commentElement.querySelector(".replies-container");
  const isHidden = repliesContainer.style.display === "none";
  repliesContainer.style.display = isHidden ? "block" : "none";
}

// Xử lý like/unlike
async function handleLike(id, isReply = false) {
  const token = localStorage.getItem("auth_token");
  if (!token) {
    alert("Vui lòng đăng nhập để thích bình luận");
    return;
  }

  try {
    const response = await fetch(`/api/comments/${id}/like`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to like comment");
    }

    const data = await response.json();

    // Find the element
    const selector = isReply
      ? `[data-reply-id="${id}"]`
      : `[data-comment-id="${id}"]`;
    const element = document.querySelector(selector);
    if (!element) return;

    // Update like button state
    const likeBtn = element.querySelector(".like-btn");
    if (likeBtn) {
      const isLiked = Boolean(data.isLiked);
      likeBtn.classList.toggle("liked", isLiked);
      likeBtn.dataset.isLiked = isLiked;

      // Update like count text
      const likeCount = data.likes || 0;
      likeBtn.innerHTML = `<i class="fas fa-heart"></i> Thích ${
        likeCount > 0 ? `(${likeCount})` : ""
      }`;
    }
  } catch (error) {
    console.error("Error liking comment:", error);
    alert("Có lỗi xảy ra khi thích bình luận. Vui lòng thử lại.");
  }
}

// Gửi reply
async function submitReply(commentId, content) {
  const token = localStorage.getItem("auth_token");
  if (!token) {
    alert("Vui lòng đăng nhập để trả lời");
    return;
  }

  const commentElement = document.querySelector(
    `[data-comment-id="${commentId}"]`
  );
  if (!commentElement) {
    console.error("Comment element not found");
    return;
  }

  const replyInput = commentElement.querySelector(".reply-input");
  if (!replyInput) {
    console.error("Reply input not found");
    return;
  }

  if (!content) {
    alert("Vui lòng nhập nội dung trả lời");
    return;
  }

  try {
    const response = await fetch(`/api/comments/${commentId}/reply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Không thể gửi trả lời. Vui lòng thử lại."
      );
    }

    // Clear input
    replyInput.value = "";

    // Hiển thị replies container và cập nhật UI
    const repliesContainer = commentElement.querySelector(".replies-container");
    const viewRepliesDiv = commentElement.querySelector(".view-replies");
    const toggleRepliesBtn = commentElement.querySelector(
      ".toggle-replies-btn"
    );

    if (repliesContainer) {
      // Tạo và thêm reply mới
      const replyElement = createReplyElement(data);
      repliesContainer.appendChild(replyElement);
      repliesContainer.style.display = "block";

      // Đếm số lượng replies trực tiếp
      const directReplies = Array.from(repliesContainer.children).filter(
        (child) => {
          const isDirectReply = !child.classList.contains("nested-reply-item");
          const replyToReplyElement = child.querySelector(
            "[data-reply-to-reply]"
          );
          return isDirectReply && !replyToReplyElement;
        }
      );
      const currentReplies = directReplies.length;

      // Cập nhật hoặc tạo mới nút toggle
      if (toggleRepliesBtn) {
        // Cập nhật nút toggle hiện có và đảm bảo hiển thị số lượng phản hồi mới
        toggleRepliesBtn.innerHTML = `<i class="fas fa-comment-dots"></i> Ẩn ${currentReplies} phản hồi`;
      } else if (!viewRepliesDiv) {
        // Tạo mới view-replies div và nút toggle
        const newViewRepliesDiv = document.createElement("div");
        newViewRepliesDiv.className = "view-replies";
        const newToggleBtn = document.createElement("button");
        newToggleBtn.className = "toggle-replies-btn";
        newToggleBtn.innerHTML = `<i class="fas fa-comment-dots"></i> Ẩn ${currentReplies} phản hồi`;
        newViewRepliesDiv.appendChild(newToggleBtn);

        // Chèn vào vị trí đúng trong DOM
        const commentContentWrapper = commentElement.querySelector(
          ".comment-content-wrapper"
        );
        commentContentWrapper.insertBefore(newViewRepliesDiv, repliesContainer);

        // Thêm event listener cho nút toggle mới
        newToggleBtn.addEventListener("click", () => {
          const isHidden = repliesContainer.style.display === "none";
          repliesContainer.style.display = isHidden ? "block" : "none";
          newToggleBtn.innerHTML = `<i class="fas fa-comment-dots"></i> ${
            isHidden ? "Ẩn" : "Xem"
          } ${currentReplies} phản hồi`;
        });
      } else {
        // Tìm và cập nhật nút toggle trong viewRepliesDiv
        const existingToggleBtn = viewRepliesDiv.querySelector(
          ".toggle-replies-btn"
        );
        if (existingToggleBtn) {
          existingToggleBtn.innerHTML = `<i class="fas fa-comment-dots"></i> Ẩn ${currentReplies} phản hồi`;
        } else {
          // Tạo mới nút toggle nếu không tìm thấy
          const newToggleBtn = document.createElement("button");
          newToggleBtn.className = "toggle-replies-btn";
          newToggleBtn.innerHTML = `<i class="fas fa-comment-dots"></i> Ẩn ${currentReplies} phản hồi`;
          viewRepliesDiv.appendChild(newToggleBtn);

          // Thêm event listener cho nút toggle mới
          newToggleBtn.addEventListener("click", () => {
            const isHidden = repliesContainer.style.display === "none";
            repliesContainer.style.display = isHidden ? "block" : "none";
            newToggleBtn.innerHTML = `<i class="fas fa-comment-dots"></i> ${
              isHidden ? "Ẩn" : "Xem"
            } ${currentReplies} phản hồi`;
          });
        }
      }

      // Đảm bảo tất cả các nút toggle được cập nhật
      const allToggleButtons = commentElement.querySelectorAll(
        ".toggle-replies-btn"
      );
      allToggleButtons.forEach((btn) => {
        btn.innerHTML = `<i class="fas fa-comment-dots"></i> ${
          repliesContainer.style.display === "none" ? "Xem" : "Ẩn"
        } ${currentReplies} phản hồi`;
      });
    }

    // Ẩn form reply
    const replyForm = commentElement.querySelector(".reply-form");
    if (replyForm) {
      replyForm.style.display = "none";
    }
  } catch (error) {
    console.error("Error submitting reply:", error);
    alert(error.message || "Có lỗi xảy ra khi gửi trả lời. Vui lòng thử lại.");
  }
}

// Hiển thị các nút trong form
function showActions() {
  if (commentFormActions) {
    commentFormActions.style.display = "flex";
    commentFormActions.style.justifyContent = "flex-end";
    commentFormActions.style.gap = "10px";
    commentFormActions.style.marginTop = "10px";

    if (postButton) {
      postButton.style.display = "inline-block";
      postButton.disabled = !commentInput?.value.trim();
    }
    if (cancelButton) {
      cancelButton.style.display = "inline-block";
    }
  }
}

// Ẩn các nút trong form
function hideActions() {
  if (commentFormActions) {
    commentFormActions.style.display = "none";
  }
}
