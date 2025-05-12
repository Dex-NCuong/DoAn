# Nền tảng đọc truyện TruyệnHay

Nền tảng đọc truyện trực tuyến với hệ thống quản lý truyện, chương VIP, thanh toán bằng xu và quản lý người dùng. Dự án bao gồm cả frontend và backend được xây dựng với Node.js và MongoDB.

## Tính năng chính

- **Hệ thống người dùng**

  - Đăng ký, đăng nhập và quản lý tài khoản
  - Phân quyền người dùng (độc giả, tác giả, quản trị viên)
  - Theo dõi và đánh giá truyện
  - Hồ sơ người dùng với danh sách truyện đã đọc và đang theo dõi

- **Hệ thống đọc truyện**

  - Hiển thị danh sách truyện theo nhiều loại và thể loại
  - Tìm kiếm và lọc truyện theo nhiều tiêu chí
  - Đọc truyện miễn phí và truyện VIP có trả phí
  - Hệ thống bình luận và đánh giá cho truyện và chương

- **Hệ thống thanh toán**

  - Nạp xu qua nhiều phương thức thanh toán
  - Mua chương VIP bằng xu
  - Lịch sử giao dịch và quản lý xu

- **Quản lý nội dung**

  - Tác giả có thể tạo và quản lý truyện, chương
  - Duyệt nội dung truyện và chương trước khi xuất bản
  - Quản lý thể loại và gói nạp xu

- **Bảng điều khiển quản trị viên**
  - Quản lý truyện, chương, người dùng
  - Quản lý giao dịch và thanh toán
  - Thống kê tổng quan về hoạt động của trang web
  - Duyệt truyện, chương và quản lý nội dung

## Công nghệ sử dụng

- **Backend**

  - Node.js & Express.js
  - MongoDB & Mongoose
  - JWT cho xác thực
  - Bcrypt.js cho mã hóa mật khẩu

- **Frontend**
  - HTML, CSS, JavaScript
  - Bootstrap cho UI
  - AJAX cho tương tác không đồng bộ

## Cài đặt

### Yêu cầu

- Node.js (>= 14.x)
- MongoDB (>= 4.x)

### Các bước cài đặt

1. Clone repository:

```bash
git clone <repository-url>
cd web-doc-truyen
```

2. Cài đặt thư viện:

```bash
npm install
```

3. Tạo file .env trong thư mục gốc:

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/novelReadingDB
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
```

4. Tạo thư mục cho upload hình ảnh:

```bash
npm run setup:dirs
```

5. Seed dữ liệu mẫu:

```bash
npm run seed
```

6. Chạy ứng dụng:

```bash
npm start
```

Hoặc để phát triển với hot reload:

```bash
npm run dev
```

7. Mở trình duyệt và truy cập: `http://localhost:3000`

## Tài khoản mẫu

Sau khi chạy seed data, các tài khoản sau sẽ được tạo:

1. **Admin**

   - Email: admin@example.com
   - Mật khẩu: admin123
   - Quyền: Quản lý toàn bộ hệ thống

2. **Tác Giả**

   - Email: author@example.com
   - Mật khẩu: author123
   - Quyền: Tạo và quản lý truyện, chương truyện

3. **Độc Giả**
   - Email: user@example.com
   - Mật khẩu: user123
   - Quyền: Đọc truyện, mua chương, nạp xu

## API Documentation

### Authentication

- `POST /api/auth/register` - Đăng ký tài khoản mới
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Lấy thông tin người dùng hiện tại

### Users

- `GET /api/users/profile` - Lấy thông tin hồ sơ người dùng
- `PUT /api/users/profile` - Cập nhật hồ sơ người dùng
- `GET /api/users/coins` - Lấy số xu hiện tại của người dùng
- `GET /api/users/followed-stories` - Lấy danh sách truyện đang theo dõi

### Stories

- `GET /api/stories` - Lấy danh sách truyện
- `GET /api/stories/:id` - Lấy chi tiết truyện
- `POST /api/stories` - Tạo truyện mới
- `PUT /api/stories/:id` - Cập nhật truyện
- `DELETE /api/stories/:id` - Xóa truyện
- `POST /api/stories/:id/follow` - Theo dõi truyện
- `POST /api/stories/:id/rate` - Đánh giá truyện

### Chapters

- `GET /api/stories/:storyId/chapters` - Lấy danh sách chương của truyện
- `GET /api/chapters/:id` - Lấy chi tiết chương
- `POST /api/stories/:storyId/chapters` - Tạo chương mới
- `PUT /api/chapters/:id` - Cập nhật chương
- `DELETE /api/chapters/:id` - Xóa chương
- `POST /api/chapters/:id/purchase` - Mua chương VIP
- `PUT /api/chapters/approve/:id` - Duyệt chương (admin)
- `PUT /api/chapters/reject/:id` - Từ chối chương (admin)

### Transactions

- `POST /api/transactions/purchase` - Tạo giao dịch nạp xu
- `GET /api/transactions` - Lấy danh sách giao dịch
- `GET /api/transactions/:id` - Lấy chi tiết giao dịch
- `PUT /api/transactions/approve/:id` - Duyệt giao dịch (admin)
- `PUT /api/transactions/cancel/:id` - Hủy giao dịch (admin)

### Coin Packages

- `GET /api/coin-packages` - Lấy danh sách gói xu
- `GET /api/coin-packages/:id` - Lấy chi tiết gói xu
- `POST /api/coin-packages` - Tạo gói xu mới (admin)
- `PUT /api/coin-packages/:id` - Cập nhật gói xu (admin)
- `DELETE /api/coin-packages/:id` - Xóa gói xu (admin)

## Cấu trúc dự án

```
novel-reading-platform/
├── app.js                  # Entry point
├── public/                 # Frontend
│   ├── css/                # CSS files
│   ├── js/                 # JavaScript files
│   │   ├── admin/          # Admin panel JS
│   │   ├── auth.js         # Authentication JS
│   │   ├── user-coins.js   # Coin management JS
│   ├── images/             # Images
│   ├── admin/              # Admin panel HTML pages
│   └── *.html              # HTML pages
├── routes/                 # API routes
│   ├── api/                # API endpoints
│   │   ├── auth.js         # Authentication routes
│   │   ├── users.js        # User routes
│   │   ├── stories.js      # Story routes
│   │   ├── chapters.js     # Chapter routes
│   │   ├── transactions.js # Transaction routes
│   │   └── coin-packages.js # Coin package routes
│   └── admin.js            # Admin routes
├── controllers/            # Route controllers
├── middleware/             # Middleware
│   ├── auth.js             # Authentication middleware
│   └── adminAuth.js        # Admin authorization
├── models/                 # Mongoose models
│   ├── User.js             # User model
│   ├── Story.js            # Story model
│   ├── Chapter.js          # Chapter model
│   ├── Transaction.js      # Transaction model
│   ├── CoinPackage.js      # Coin package model
│   ├── Genre.js            # Genre model
│   └── Setting.js          # System settings model
├── scripts/                # Utility scripts
│   ├── seed-stories.js     # Seed data script
│   └── create-image-dirs.js # Create upload dirs
├── views/                  # EJS templates (if used)
├── .env                    # Environment variables
├── package.json            # Dependencies
└── README.md               # Project documentation
```

## Cập nhật gần đây

### v1.1.0 (07/04/2025)

- Thêm API endpoint để lấy số xu hiện tại của người dùng
- Cải thiện giao diện trang nạp xu
- Sửa lỗi không hiển thị số xu hiện có trong trang nạp xu
- Thêm hệ thống thanh toán cho việc nạp xu
- Cập nhật API để xử lý giao dịch nạp xu

### v1.0.0 (05/04/2025)

- Phát hành phiên bản đầu tiên
- Hệ thống đọc truyện cơ bản
- Quản lý người dùng và phân quyền
- Hệ thống truyện VIP và thanh toán bằng xu
- Giao diện quản trị

## Đóng góp

Đóng góp luôn được chào đón! Vui lòng tạo một issue hoặc pull request để đóng góp vào dự án.

## Giấy phép

Dự án được phân phối dưới Giấy phép ISC.
