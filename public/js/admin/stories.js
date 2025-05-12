// Stories Management

// Variables
let currentPage = 1;
let totalPages = 1;
let stories = [];
let genres = [];
let editingStoryId = null;
const itemsPerPage = 10;
// Thêm biến toàn cục cho filter
let globalSearchTerm = "";
let globalStatusFilter = "";

// DOM Elements
document.addEventListener("DOMContentLoaded", function () {
  // Kiểm tra quyền admin
  if (!checkAdminAuth()) return;

  console.log("DOM loaded for stories page");

  // Log các element quan trọng
  console.log("storyModal exists:", !!document.getElementById("storyModal"));
  console.log("modalTitle exists:", !!document.getElementById("modalTitle"));
  console.log("addStoryBtn exists:", !!document.getElementById("addStoryBtn"));
  console.log("storyForm exists:", !!document.getElementById("storyForm"));

  // Tải danh sách truyện
  loadStories(1);

  // Tải danh sách thể loại
  loadGenres();

  // Khởi tạo sự kiện tìm kiếm
  initSearchFilter();

  // Khởi tạo Select2 cho dropdown thể loại
  try {
    console.log(
      "Khởi tạo Select2 cho element:",
      document.getElementById("storyGenres")
    );
    $("#storyGenres").select2({
      placeholder: "Chọn thể loại",
      allowClear: true,
      width: "100%",
      dropdownParent: $("#addStoryModal"),
    });
  } catch (error) {
    console.error("Lỗi khởi tạo Select2:", error);
  }

  // Thêm sự kiện khi modal hiển thị để khởi tạo lại Select2
  $("#addStoryModal").on("shown.bs.modal", function () {
    console.log("Modal đã hiển thị, khởi tạo lại Select2");
    setTimeout(() => {
      try {
        $("#storyGenres").select2("destroy");
        $("#storyGenres").select2({
          placeholder: "Chọn thể loại",
          allowClear: true,
          width: "100%",
          dropdownParent: $("#addStoryModal"),
        });
        console.log("Đã khởi tạo lại Select2 khi modal hiển thị");
      } catch (error) {
        console.error("Lỗi khởi tạo lại Select2 khi modal hiển thị:", error);
      }
    }, 300);
  });

  // Khởi tạo sự kiện cho nút thêm truyện
  const addStoryBtn = document.getElementById("addStoryBtn");
  if (addStoryBtn) {
    // Đã chuyển sang trang add-story.html, không cần xử lý modal nữa
  }

  // Khởi tạo sự kiện cho nút lưu truyện
  const saveStoryBtn = document.getElementById("saveStoryBtn");
  if (saveStoryBtn) {
    saveStoryBtn.addEventListener("click", function () {
      saveStory();
    });
  }

  // Xem trước ảnh bìa khi chọn file
  const coverFileInput = document.getElementById("storyCover");
  if (coverFileInput) {
    coverFileInput.addEventListener("change", function (e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function (e) {
        const previewContainer = document.getElementById("imagePreview");
        previewContainer.innerHTML = `<img src="${e.target.result}" alt="Cover Preview" class="img-fluid img-thumbnail" style="max-height: 200px;">`;
      };
      reader.readAsDataURL(file);
    });
  }

  // Sự kiện cho nút Đặt lại filter
  const resetBtn = document.getElementById("resetFilterBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      const searchInput = document.getElementById("searchStory");
      const statusFilter = document.getElementById("statusFilter");
      if (searchInput) searchInput.value = "";
      if (statusFilter) statusFilter.value = "";
      globalSearchTerm = "";
      globalStatusFilter = "";
      loadStories(1, "", "");
    });
  }
});

// Tải danh sách truyện
async function loadStories(
  page = 1,
  searchTerm = globalSearchTerm,
  statusFilter = globalStatusFilter
) {
  currentPage = page;
  // Lưu lại filter toàn cục
  globalSearchTerm = searchTerm;
  globalStatusFilter = statusFilter;

  const storyListElement = document.getElementById("storyList");
  if (!storyListElement) return;

  // Hiển thị loading
  storyListElement.innerHTML = `
    <tr>
      <td colspan="8" class="text-center">
        <div class="loader">
          <div class="loader-spinner"></div>
        </div>
        <p>Đang tải danh sách truyện từ database...</p>
      </td>
    </tr>
  `;

  try {
    // Xây dựng URL với các tham số truy vấn - Sửa API endpoint đúng
    let url = `/admin/stories?page=${page}&limit=${itemsPerPage}`;
    if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
    if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;

    console.log("Đang gọi API:", url);

    // Gọi API để lấy dữ liệu
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        // Đã bỏ token xác thực tạm thời
      },
    });

    if (!response.ok) {
      throw new Error(
        `Lỗi kết nối API: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log("Dữ liệu truyện từ API:", data);

    // Kiểm tra cấu trúc dữ liệu trả về
    if (!data) {
      throw new Error("Dữ liệu không hợp lệ hoặc rỗng");
    }

    // Thiết lập dữ liệu truyện
    if (data.success && data.data && data.data.stories) {
      stories = data.data.stories || [];
    } else if (data.data) {
      stories = data.data || [];
    } else if (data.stories) {
      stories = data.stories || [];
    } else {
      console.warn("Không tìm thấy dữ liệu truyện trong response");
      stories = [];
    }

    // Đảm bảo stories luôn là một array
    if (!Array.isArray(stories)) {
      console.warn("stories không phải là array, khởi tạo thành mảng rỗng");
      stories = [];
    }

    // Xử lý thông tin phân trang
    if (data.data && data.data.pagination) {
      totalPages = data.data.pagination.totalPages || 1;
    } else if (data.pagination) {
      totalPages = data.pagination.totalPages || 1;
    } else if (data.meta) {
      totalPages = data.meta.totalPages || 1;
    } else {
      totalPages = 1;
    }

    // Render stories
    renderStories(stories);

    // Tạo phân trang
    createPagination(currentPage, totalPages, (newPage) => {
      loadStories(newPage, globalSearchTerm, globalStatusFilter);
    });
  } catch (error) {
    console.error("Lỗi khi tải danh sách truyện:", error);

    // Hiển thị thông báo lỗi trong bảng
    storyListElement.innerHTML = `
      <tr>
        <td colspan="8" class="text-center">
          <p class="text-danger">Đã xảy ra lỗi khi tải danh sách truyện: ${error.message}.</p>
          <button class="btn btn-sm btn-primary mt-2" onclick="loadStories(${currentPage}, '${globalSearchTerm}', '${globalStatusFilter}')">
            <i class="fas fa-sync-alt"></i> Thử lại
          </button>
        </td>
      </tr>
    `;

    // Hiển thị toast thông báo
    showToast(
      "error",
      "Lỗi",
      "Không thể tải danh sách truyện từ database. " + error.message
    );
  }
}

// Render danh sách truyện
function renderStories(storiesToRender = []) {
  const storyListElement = document.getElementById("storyList");
  if (!storyListElement) return;

  // Đảm bảo storiesToRender là một array
  if (!Array.isArray(storiesToRender)) {
    console.error(
      "renderStories: storiesToRender không phải là array, đang chuyển thành array rỗng",
      storiesToRender
    );
    storiesToRender = [];
  }

  if (storiesToRender.length === 0) {
    storyListElement.innerHTML = `
      <tr>
        <td colspan="8" class="text-center">
          <p>Không có truyện nào</p>
        </td>
      </tr>
    `;
    return;
  }

  let html = "";

  storiesToRender.forEach((story) => {
    const truncatedDescription = truncateText(story.description || "", 50);
    const statusClass = getStatusClass(story.status);
    const statusText = getStatusText(story.status);

    // Kiểm tra và xử lý cấu trúc thể loại
    let genresHtml = "";
    if (
      story.genres &&
      Array.isArray(story.genres) &&
      story.genres.length > 0
    ) {
      const displayGenres = story.genres.slice(0, 3);
      genresHtml = displayGenres
        .map((g) => {
          // Xử lý trường hợp g có thể là string hoặc object
          const genreId = typeof g === "object" ? g._id || g.id : g;
          const genreName = typeof g === "object" ? g.name : "Thể loại";
          return `<span class="badge genre-badge" data-genre-id="${genreId}">${escapeHtml(
            genreName
          )}</span>`;
        })
        .join(" ");

      // Nếu có nhiều hơn 3 thể loại, hiển thị số lượng còn lại
      if (story.genres.length > 3) {
        genresHtml += ` <span class="badge badge-secondary">+${
          story.genres.length - 3
        }</span>`;
      }
    } else {
      genresHtml = '<span class="badge badge-secondary">Chưa phân loại</span>';
    }

    // Đảm bảo story._id tồn tại
    const storyId = story._id || story.id || "";

    html += `
      <tr>
        <td>${storyId.substring(0, 6)}</td>
        <td>
          <img src="${
            story.coverImage || "../images/default-cover.jpg"
          }" alt="${escapeHtml(story.title || "")}" class="story-thumbnail">
        </td>
        <td>
          <div class="story-title">${escapeHtml(story.title || "")}</div>
          <div class="story-desc">${escapeHtml(truncatedDescription)}</div>
        </td>
        <td>${escapeHtml(story.author || "")}</td>
        <td class="genres-cell">${genresHtml}</td>
        <td><span class="badge ${statusClass}">${statusText}</span></td>
        <td>${(story.views || 0).toLocaleString()}</td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-sm btn-primary edit-story" data-id="${storyId}">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-danger delete-story" data-id="${storyId}" data-title="${escapeHtml(
      story.title || ""
    )}">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  storyListElement.innerHTML = html;

  // Thêm sự kiện cho các nút
  const editButtons = document.querySelectorAll(".edit-story");
  const deleteButtons = document.querySelectorAll(".delete-story");

  editButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const storyId = btn.dataset.id;
      window.location.href = `add-story.html?id=${storyId}`;
    });
  });

  deleteButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const storyId = btn.dataset.id;
      const storyTitle = btn.dataset.title;
      openDeleteModal(storyId, storyTitle);
    });
  });
}

// Lấy thể loại CSS dựa trên trạng thái
function getStatusClass(status) {
  switch (status) {
    case "ongoing":
      return "badge-primary";
    case "completed":
      return "badge-success";
    case "paused":
      return "badge-warning";
    default:
      return "badge-secondary";
  }
}

// Lấy text trạng thái
function getStatusText(status) {
  switch (status) {
    case "ongoing":
      return "Đang ra";
    case "completed":
      return "Hoàn thành";
    case "paused":
      return "Tạm ngưng";
    default:
      return "Không xác định";
  }
}

// Tải danh sách thể loại
async function loadGenres() {
  try {
    console.log("Bắt đầu tải danh sách thể loại từ database...");

    // Tìm element select genres
    const genresSelect = document.getElementById("storyGenres");
    if (!genresSelect) {
      // Không còn log lỗi khi không có element này (ví dụ ở trang danh sách)
      return;
    } else {
      console.log("Đã tìm thấy select element:", genresSelect);
    }

    // Hiển thị trạng thái đang tải
    genresSelect.innerHTML =
      '<option value="" disabled selected>Đang tải thể loại...</option>';

    // Gọi API để lấy dữ liệu thể loại
    console.log("Gọi API lấy thể loại...");
    const response = await fetch("/admin/genres", {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Lỗi API: ${response.status} - ${response.statusText}`);
    }

    // Kiểm tra Content-Type để đảm bảo nhận về JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.warn("API không trả về JSON. Content-Type:", contentType);
      throw new Error("Server không trả về dữ liệu JSON hợp lệ");
    }

    console.log("Nhận phản hồi từ API, đang phân tích JSON...");
    const data = await response.json();
    console.log("Dữ liệu thể loại từ API:", data);

    // Phân tích dữ liệu API
    let genresList = [];

    if (data.success && data.data) {
      genresList = data.data;
      console.log("Đã tìm thấy data.data:", genresList);
    } else if (data.genres) {
      genresList = data.genres;
      console.log("Đã tìm thấy data.genres:", genresList);
    } else if (Array.isArray(data)) {
      genresList = data;
      console.log("Data là một mảng trực tiếp:", genresList);
    } else {
      console.error("Cấu trúc dữ liệu không theo dự kiến:", data);

      // Tạo dữ liệu mẫu tạm thời để ứng dụng hoạt động
      genresList = [
        { _id: "temp1", name: "Tiên Hiệp" },
        { _id: "temp2", name: "Kiếm Hiệp" },
        { _id: "temp3", name: "Ngôn Tình" },
        { _id: "temp4", name: "Đô Thị" },
        { _id: "temp5", name: "Huyền Huyễn" },
        { _id: "temp6", name: "Xuyên Không" },
      ];
      console.log("Sử dụng dữ liệu mẫu tạm thời:", genresList);
    }

    // Đặt biến global
    genres = Array.isArray(genresList) ? genresList : [];

    // Xóa các options cũ
    genresSelect.innerHTML = "";

    if (genres.length === 0) {
      genresSelect.innerHTML =
        '<option value="" disabled selected>Không có thể loại nào</option>';
      console.warn("Không có dữ liệu thể loại");
      return;
    }

    console.log(
      "Bắt đầu tạo options cho select với",
      genres.length,
      "thể loại"
    );

    // Thêm các options mới
    genres.forEach((genre) => {
      const option = document.createElement("option");
      option.value = genre._id || genre.id || "";
      option.textContent = genre.name || "Không có tên";
      genresSelect.appendChild(option);
      console.log(`Đã thêm option: ${option.textContent} (${option.value})`);
    });

    console.log(`Hoàn thành: Đã tải ${genres.length} thể loại`);

    // Cập nhật Select2
    try {
      $(genresSelect).trigger("change");
      console.log("Đã trigger change event cho select2");
    } catch (err) {
      console.warn("Không thể cập nhật Select2:", err);
    }
  } catch (error) {
    console.error("Lỗi khi tải danh sách thể loại:", error);

    // Hiển thị thông báo lỗi
    showToast(
      "error",
      "Lỗi",
      "Không thể tải thể loại từ database: " + error.message
    );

    // Khôi phục UI với dữ liệu mẫu
    const genresSelect = document.getElementById("storyGenres");
    if (genresSelect) {
      genresSelect.innerHTML = "";
      const tempGenres = [
        { _id: "temp1", name: "Tiên Hiệp" },
        { _id: "temp2", name: "Kiếm Hiệp" },
        { _id: "temp3", name: "Ngôn Tình" },
        { _id: "temp4", name: "Đô Thị" },
        { _id: "temp5", name: "Huyền Huyễn" },
        { _id: "temp6", name: "Xuyên Không" },
      ];

      tempGenres.forEach((genre) => {
        const option = document.createElement("option");
        option.value = genre._id;
        option.textContent = genre.name;
        genresSelect.appendChild(option);
      });

      try {
        $(genresSelect).trigger("change");
      } catch (err) {
        console.warn("Không thể cập nhật Select2 cho dữ liệu mẫu:", err);
      }
    }
  }
}

// Mở modal thêm truyện mới
function openStoryModal() {
  console.log("Mở modal thêm truyện mới");
  resetStoryForm();

  const modal = document.getElementById("storyModal");
  const modalTitle = document.getElementById("modalTitle");

  if (modal && modalTitle) {
    modalTitle.textContent = "Thêm truyện mới";
    modal.classList.add("show");
    editingStoryId = null;
  } else {
    console.error("Không tìm thấy modal hoặc tiêu đề modal");
    if (!modal) console.error("Modal không tồn tại: storyModal");
    if (!modalTitle) console.error("modalTitle không tồn tại");
  }
}

// Mở modal chỉnh sửa truyện
function openEditStoryModal(storyId) {
  console.log("Đang mở modal chỉnh sửa truyện:", storyId);
  const story = stories.find((s) => s._id === storyId);
  if (!story) {
    console.error("Không tìm thấy truyện với ID:", storyId);
    return;
  }

  // Hiển thị modal
  const modal = new bootstrap.Modal(document.getElementById("addStoryModal"));
  const modalTitle = document.getElementById("modalTitle");

  if (modal && modalTitle) {
    modalTitle.textContent = "Chỉnh sửa truyện";

    // Fill form data
    document.getElementById("storyId").value = story._id;
    document.getElementById("storyTitle").value = story.title || "";
    document.getElementById("storyStatus").value = story.status || "ongoing";
    document.getElementById("storyDescription").value = story.description || "";
    document.getElementById("storyAuthor").value = story.author || "";

    // Checkbox options
    document.getElementById("isHot").checked = story.isHot || false;
    document.getElementById("isNew").checked = story.isNew || false;
    document.getElementById("isFull").checked = story.status === "completed";

    // Reset file input
    const coverFileInput = document.getElementById("storyCover");
    if (coverFileInput) {
      coverFileInput.value = ""; // Reset file input
    }

    // Display existing cover image preview
    const imagePreview = document.getElementById("imagePreview");
    if (imagePreview && story.coverImage) {
      imagePreview.innerHTML = `
        <img src="${story.coverImage}" alt="Ảnh bìa" class="img-fluid img-thumbnail" style="max-height: 200px;">
        <p class="mt-2 text-muted">Ảnh bìa hiện tại. Chọn file mới để thay đổi.</p>
      `;
    }

    // Set genres - đợi một chút để đảm bảo Select2 đã được khởi tạo
    setTimeout(() => {
      try {
        const genresSelect = document.getElementById("storyGenres");
        if (genresSelect) {
          // Clear previous selections
          $(genresSelect).val(null).trigger("change");

          // Lấy danh sách ID của thể loại
          const storyGenreIds = story.genres.map((g) =>
            typeof g === "object" ? g._id || g.id : g
          );

          console.log("Danh sách thể loại của truyện:", storyGenreIds);

          // Đặt giá trị mới
          $(genresSelect).val(storyGenreIds).trigger("change");
        }
      } catch (e) {
        console.error("Lỗi khi cập nhật các thể loại:", e);
      }
    }, 500);

    // Show modal
    modal.show();
    editingStoryId = story._id;

    console.log("Đã mở modal chỉnh sửa với ID truyện:", editingStoryId);
  }
}

// Reset form truyện
function resetStoryForm() {
  const form = document.getElementById("storyForm");
  if (form) {
    form.reset();
    document.getElementById("storyId").value = "";
    document.getElementById("imagePreview").innerHTML = "";
  }
}

// Lưu truyện mới
async function saveStory() {
  // Lấy dữ liệu từ form
  const storyId = document.getElementById("storyId").value.trim();
  const title = document.getElementById("storyTitle").value.trim();
  const description = document.getElementById("storyDescription").value.trim();
  const status = document.getElementById("storyStatus").value;
  const author = document.getElementById("storyAuthor").value.trim();

  // Lấy các tùy chọn đặc biệt
  const isHot = document.getElementById("isHot").checked;
  const isNew = document.getElementById("isNew").checked;
  const isFull = document.getElementById("isFull").checked;

  console.log("Tùy chọn đặc biệt:", {
    isHot: isHot,
    isNew: isNew,
    isFull: isFull,
  });

  // Lấy thể loại đã chọn
  const selectedGenres = [];
  const genreSelect = document.getElementById("storyGenres");
  for (let i = 0; i < genreSelect.selectedOptions.length; i++) {
    selectedGenres.push(genreSelect.selectedOptions[i].value);
  }

  // Kiểm tra tệp ảnh bìa
  const coverFile = document.getElementById("storyCover").files[0];

  // Kiểm tra dữ liệu đầu vào
  if (!title) {
    alert("Vui lòng nhập tiêu đề truyện");
    return;
  }

  if (selectedGenres.length === 0) {
    alert("Vui lòng chọn ít nhất một thể loại");
    return;
  }

  if (!author) {
    alert("Vui lòng nhập tên tác giả");
    return;
  }

  let originalText = "";
  try {
    // Hiển thị loading
    const saveButton = document.getElementById("saveStoryBtn");
    originalText = saveButton.innerHTML;
    saveButton.disabled = true;
    saveButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang lưu...`;

    // Tạo FormData để gửi dữ liệu bao gồm tệp
    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("author", author);

    // Xác định trạng thái dựa trên lựa chọn
    let finalStatus = status; // Sử dụng giá trị status từ form
    if (isFull) {
      finalStatus = "completed";
    }
    formData.append("status", finalStatus);

    // Thêm các tùy chọn đặc biệt
    formData.append("isHot", isHot);
    formData.append("isNew", isNew);

    // Thêm thể loại - cần gửi dưới dạng JSON string vì controller đang parse JSON
    formData.append("genres", JSON.stringify(selectedGenres));

    // Thêm ảnh bìa nếu có
    if (coverFile) {
      formData.append("coverImage", coverFile);
    }

    // Xác định đây là thêm mới hay cập nhật
    const isUpdate = !!storyId;
    let url = "/admin/stories";
    let method = "POST";

    if (isUpdate) {
      url = `/admin/stories/${storyId}`;
      method = "PUT";
      console.log("Đang cập nhật truyện ID:", storyId);
    } else {
      console.log("Đang thêm mới truyện");
    }

    // Log toàn bộ dữ liệu trong FormData để debug
    console.log("FormData contents:");
    for (let pair of formData.entries()) {
      console.log(pair[0] + ": " + pair[1]);
    }

    console.log("Đang gửi yêu cầu lưu truyện với dữ liệu:", {
      title,
      status: finalStatus,
      isHot,
      isNew,
      isFull,
      genres: selectedGenres,
      hasCover: !!coverFile,
      isUpdate,
    });

    // Gửi yêu cầu API để lưu truyện
    let response;
    try {
      response = await fetch(url, {
        method: method,
        body: formData,
      });
    } catch (fetchError) {
      console.error("Lỗi kết nối:", fetchError);
      throw new Error(
        "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại."
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      try {
        // Thử parse JSON từ phản hồi
        const errorData = JSON.parse(errorText);
        throw new Error(
          errorData.message || `Lỗi ${response.status}: ${response.statusText}`
        );
      } catch (jsonError) {
        // Nếu không phải JSON, hiển thị nội dung phản hồi gốc để debug
        console.error("Phản hồi lỗi không phải JSON:", errorText);
        if (errorText.includes("<!DOCTYPE html>")) {
          throw new Error(
            `Lỗi ${response.status}: Server trả về HTML thay vì JSON. Có thể là lỗi server.`
          );
        } else {
          throw new Error(`Lỗi ${response.status}: ${response.statusText}`);
        }
      }
    }

    // Xử lý phản hồi
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Server không trả về dữ liệu JSON hợp lệ");
    }

    const result = await response.json();
    console.log("Phản hồi API:", result);

    if (result.success || result.data) {
      // Tạo đối tượng truyện mới
      const newOrUpdatedStory = result.data || result;

      // Đảm bảo stories là một mảng trước khi thêm vào
      if (!Array.isArray(stories)) {
        console.warn("stories không phải là mảng, khởi tạo lại");
        stories = [];
      }

      if (isUpdate) {
        // Cập nhật truyện đã tồn tại trong danh sách
        const index = stories.findIndex((s) => s._id === storyId);
        if (index !== -1) {
          stories[index] = newOrUpdatedStory;
        } else {
          // Nếu không tìm thấy, thêm vào đầu danh sách
          stories.unshift(newOrUpdatedStory);
        }
      } else {
        // Thêm truyện mới vào đầu danh sách
        stories.unshift(newOrUpdatedStory);
      }

      // Làm mới danh sách truyện
      renderStories(stories);

      // Đóng modal và reset form (chỉ thực hiện nếu có modal)
      const modalElement = document.getElementById("addStoryModal");
      if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) modal.hide();
      }
      document.getElementById("storyForm").reset();

      // Hiển thị thông báo thành công
      showToast(
        "success",
        "Thành công",
        isUpdate
          ? "Truyện đã được cập nhật thành công"
          : "Truyện đã được thêm mới thành công"
      );
      // Nếu đang ở trang add-story.html thì chuyển hướng về danh sách truyện sau khi lưu thành công
      if (window.location.pathname.includes("add-story.html")) {
        setTimeout(() => {
          window.location.href = "stories.html";
        }, 1200);
      }
    } else {
      throw new Error(
        result.message || "Không thể lưu truyện, vui lòng thử lại"
      );
    }
  } catch (error) {
    console.error("Lỗi khi lưu truyện:", error);
    showToast("error", "Lỗi", error.message || "Đã xảy ra lỗi khi lưu truyện");
  } finally {
    // Khôi phục trạng thái nút lưu
    const saveButton = document.getElementById("saveStoryBtn");
    saveButton.disabled = false;
    saveButton.innerHTML = originalText;
  }
}

// Mở modal xác nhận xóa truyện
function openDeleteModal(storyId, storyTitle) {
  // Thiết lập thông tin xóa
  document.getElementById("deleteStoryTitle").textContent = storyTitle || "";

  // Lưu ID truyện cần xóa để sử dụng khi nhấn nút xác nhận
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
  confirmDeleteBtn.dataset.storyId = storyId;

  // Thiết lập sự kiện cho nút xác nhận xóa
  confirmDeleteBtn.onclick = function () {
    deleteStory(storyId);
  };

  // Hiển thị modal xác nhận xóa
  const deleteModal = new bootstrap.Modal(
    document.getElementById("deleteModal")
  );
  deleteModal.show();
}

// Xóa truyện
async function deleteStory(storyId) {
  if (!storyId) {
    showToast("error", "Lỗi", "Không tìm thấy ID truyện cần xóa");
    return;
  }

  try {
    // Hiển thị loading
    const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
    const originalButtonText = confirmDeleteBtn.innerHTML;
    confirmDeleteBtn.disabled = true;
    confirmDeleteBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang xóa...`;

    console.log("Đang gửi yêu cầu xóa truyện với ID:", storyId);

    // Gọi API để xóa truyện
    const response = await fetch(`/admin/stories/${storyId}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        // Đã bỏ token xác thực tạm thời
        // Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(
          errorData.message || `Lỗi ${response.status}: ${response.statusText}`
        );
      } catch (jsonError) {
        throw new Error(`Lỗi ${response.status}: ${response.statusText}`);
      }
    }

    // Xóa thành công, cập nhật UI
    const index = stories.findIndex((story) => story._id === storyId);
    if (index !== -1) {
      stories.splice(index, 1);
      renderStories(stories);
    }

    // Đóng modal
    const deleteModal = bootstrap.Modal.getInstance(
      document.getElementById("deleteModal")
    );
    deleteModal.hide();

    // Hiển thị thông báo thành công
    showToast("success", "Thành công", "Truyện đã được xóa thành công");
  } catch (error) {
    console.error("Lỗi khi xóa truyện:", error);
    showToast("error", "Lỗi", error.message || "Đã xảy ra lỗi khi xóa truyện");
  } finally {
    // Khôi phục trạng thái nút xóa
    const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.innerHTML = originalButtonText || "Xóa"; // Thêm giá trị mặc định "Xóa" nếu originalButtonText undefined
  }
}

// Cắt text dài
function truncateText(text, maxLength) {
  if (!text) return "";
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
}

// Escape HTML để tránh XSS
function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text?.replace(/[&<>"']/g, (m) => map[m]) || "";
}

// Khởi tạo bộ lọc tìm kiếm
function initSearchFilter() {
  const searchInput = document.getElementById("searchStory");
  const statusFilter = document.getElementById("statusFilter");

  if (searchInput) {
    searchInput.addEventListener(
      "input",
      debounce(() => {
        const searchTerm = searchInput.value.trim();
        const status = statusFilter ? statusFilter.value : "";
        loadStories(1, searchTerm, status);
      }, 500)
    );
  }

  if (statusFilter) {
    statusFilter.addEventListener("change", () => {
      const searchTerm = searchInput ? searchInput.value.trim() : "";
      const status = statusFilter.value;
      loadStories(1, searchTerm, status);
    });
  }
}

// Debounce function
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Hiển thị thông báo dạng toast
function showToast(type, title, message) {
  // Tạo ID duy nhất cho toast
  const toastId = "toast-" + Date.now();

  // Xác định class dựa trên type
  let bgClass = "bg-primary";
  let icon = '<i class="fas fa-info-circle me-2"></i>';

  if (type === "success") {
    bgClass = "bg-success";
    icon = '<i class="fas fa-check-circle me-2"></i>';
  } else if (type === "error") {
    bgClass = "bg-danger";
    icon = '<i class="fas fa-exclamation-circle me-2"></i>';
  } else if (type === "warning") {
    bgClass = "bg-warning";
    icon = '<i class="fas fa-exclamation-triangle me-2"></i>';
  }

  // Tạo HTML cho toast
  const toastHTML = `
    <div id="${toastId}" class="toast align-items-center ${bgClass} text-white border-0" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body">
          ${icon}
          <strong>${title}</strong>: ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `;

  // Thêm toast vào container
  const toastContainer = document.querySelector(".toast-container");
  if (!toastContainer) {
    // Tạo container nếu chưa tồn tại
    const newContainer = document.createElement("div");
    newContainer.className =
      "toast-container position-fixed bottom-0 end-0 p-3";
    newContainer.style.zIndex = "5";
    document.body.appendChild(newContainer);
    newContainer.innerHTML = toastHTML;
  } else {
    toastContainer.innerHTML += toastHTML;
  }

  // Khởi tạo và hiển thị toast
  const toastElement = document.getElementById(toastId);
  const toast = new bootstrap.Toast(toastElement, {
    autohide: true,
    delay: 5000,
  });
  toast.show();

  // Xóa toast khỏi DOM sau khi ẩn
  toastElement.addEventListener("hidden.bs.toast", function () {
    toastElement.remove();
  });
}

// Tạo phân trang
function createPagination(currentPage, totalPages, callback) {
  const paginationElement = document.getElementById("pagination");
  if (!paginationElement) return;

  // Số trang hiển thị tối đa
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  // Điều chỉnh lại startPage nếu endPage đạt giới hạn
  if (endPage - startPage + 1 < maxVisiblePages && startPage > 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  let html = "";

  // Nút trang đầu tiên
  if (currentPage > 1) {
    html += `<a href="#" data-page="1">&laquo; Đầu</a>`;
    html += `<a href="#" data-page="${currentPage - 1}">&lsaquo; Trước</a>`;
  }

  // Các nút trang số
  for (let i = startPage; i <= endPage; i++) {
    html += `<a href="#" data-page="${i}" class="${
      i === currentPage ? "active" : ""
    }">${i}</a>`;
  }

  // Nút trang cuối
  if (currentPage < totalPages) {
    html += `<a href="#" data-page="${currentPage + 1}">Sau &rsaquo;</a>`;
    html += `<a href="#" data-page="${totalPages}">Cuối &raquo;</a>`;
  }

  paginationElement.innerHTML = html;

  // Thêm sự kiện cho các nút phân trang
  const pageLinks = paginationElement.querySelectorAll("a");
  pageLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const pageNum = parseInt(this.dataset.page);
      // Reset filter khi chuyển trang
      if (pageNum !== 1) {
        globalSearchTerm = "";
        globalStatusFilter = "";
        // Reset input UI
        const searchInput = document.getElementById("searchStory");
        const statusFilter = document.getElementById("statusFilter");
        if (searchInput) searchInput.value = "";
        if (statusFilter) statusFilter.value = "";
      }
      callback(pageNum);
    });
  });
}
