const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Genre = require("./models/Genre");
const Story = require("./models/Story");
const Chapter = require("./models/Chapter");

// Load env vars
dotenv.config();

// Connect to DB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Sample data
const genres = [
  {
    name: "Tiên Hiệp",
    description: "Truyện có yếu tố thần tiên, tu tiên, đạo pháp",
  },
  {
    name: "Kiếm Hiệp",
    description: "Truyện có yếu tố võ công, kiếm khí",
  },
  {
    name: "Ngôn Tình",
    description: "Truyện tình cảm lãng mạn",
  },
  {
    name: "Đô Thị",
    description: "Truyện có bối cảnh hiện đại",
  },
  {
    name: "Huyền Huyễn",
    description: "Truyện có yếu tố huyền bí, thần bí",
  },
  {
    name: "Lịch Sử",
    description: "Truyện có bối cảnh lịch sử",
  },
];

// Create seed data
const seedDB = async () => {
  try {
    // Clear database
    await User.deleteMany({});
    await Genre.deleteMany({});
    await Story.deleteMany({});
    await Chapter.deleteMany({});

    console.log("Database cleared");

    // Create admin user
    const adminPassword = await bcrypt.hash("admin123", 10);
    const admin = await User.create({
      name: "Admin",
      email: "admin@example.com",
      password: adminPassword,
      role: "admin",
      coins: 1000,
    });

    // Create author user
    const authorPassword = await bcrypt.hash("author123", 10);
    const author = await User.create({
      name: "Tác Giả",
      email: "author@example.com",
      password: authorPassword,
      role: "author",
      coins: 500,
    });

    // Create normal user
    const userPassword = await bcrypt.hash("user123", 10);
    const normalUser = await User.create({
      name: "Độc Giả",
      email: "user@example.com",
      password: userPassword,
      role: "user",
      coins: 200,
    });

    console.log("Users created");

    // Create genres
    const createdGenres = await Genre.insertMany(genres);

    console.log("Genres created");

    // Create stories
    const tienHiepGenre = createdGenres.find((g) => g.name === "Tiên Hiệp");
    const kiemHiepGenre = createdGenres.find((g) => g.name === "Kiếm Hiệp");
    const doThiGenre = createdGenres.find((g) => g.name === "Đô Thị");

    const story1 = await Story.create({
      title: "Thần Đạo Đan Tôn",
      description:
        "Một tác phẩm tu tiên hấp dẫn với nhân vật chính có khả năng luyện đan siêu phàm, từng bước đi lên đỉnh cao của thế giới tu luyện.",
      author: author._id,
      cover: "/images/stories/cover1.jpg",
      genres: [tienHiepGenre._id],
      status: "ongoing",
      isVIP: true,
    });

    const story2 = await Story.create({
      title: "Kiếm Đạo Độc Tôn",
      description:
        "Câu chuyện về một kiếm khách tài ba đi khắp thiên hạ tìm kiếm bí kíp võ công tối thượng.",
      author: author._id,
      cover: "/images/stories/cover2.jpg",
      genres: [kiemHiepGenre._id],
      status: "ongoing",
      isVIP: false,
    });

    const story3 = await Story.create({
      title: "Đô Thị Chí Tôn",
      description:
        "Một thanh niên bình thường bỗng nhiên thức tỉnh siêu năng lực trong thế giới hiện đại.",
      author: author._id,
      cover: "/images/stories/cover3.jpg",
      genres: [doThiGenre._id],
      status: "ongoing",
      isVIP: true,
    });

    console.log("Stories created");

    // Create chapters for story 1
    const chapters1 = [];
    for (let i = 1; i <= 10; i++) {
      const isVIP = i > 5; // Chương 6+ là VIP

      const chapter = await Chapter.create({
        story: story1._id,
        title: `Chương ${i}: ${
          i <= 5 ? "Khởi đầu hành trình" : "Bí mật hé lộ"
        } (${i})`,
        content: `<p>Nội dung chương ${i} của truyện Thần Đạo Đan Tôn.</p>
          <p>Đây là đoạn mở đầu...</p>
          <p>Tiếp theo là phần nội dung chính...</p>
          <p>Cuối cùng là phần kết thúc...</p>`,
        number: i,
        isVIP,
        coinPrice: isVIP ? 10 : 0,
        status: "published",
        publishedAt: new Date(),
        author: author._id,
      });

      chapters1.push(chapter._id);
    }

    // Create chapters for story 2
    const chapters2 = [];
    for (let i = 1; i <= 8; i++) {
      const chapter = await Chapter.create({
        story: story2._id,
        title: `Chương ${i}: Giang hồ hiểm ác (${i})`,
        content: `<p>Nội dung chương ${i} của truyện Kiếm Đạo Độc Tôn.</p>
          <p>Đây là đoạn mở đầu...</p>
          <p>Tiếp theo là phần nội dung chính...</p>
          <p>Cuối cùng là phần kết thúc...</p>`,
        number: i,
        isVIP: false,
        coinPrice: 0,
        status: "published",
        publishedAt: new Date(),
        author: author._id,
      });

      chapters2.push(chapter._id);
    }

    // Create chapters for story 3
    const chapters3 = [];
    for (let i = 1; i <= 6; i++) {
      const isVIP = i > 3; // Chương 4+ là VIP

      const chapter = await Chapter.create({
        story: story3._id,
        title: `Chương ${i}: Siêu năng lực thức tỉnh (${i})`,
        content: `<p>Nội dung chương ${i} của truyện Đô Thị Chí Tôn.</p>
          <p>Đây là đoạn mở đầu...</p>
          <p>Tiếp theo là phần nội dung chính...</p>
          <p>Cuối cùng là phần kết thúc...</p>`,
        number: i,
        isVIP,
        coinPrice: isVIP ? 15 : 0,
        status: "published",
        publishedAt: new Date(),
        author: author._id,
      });

      chapters3.push(chapter._id);
    }

    // Update stories with chapters
    await Story.findByIdAndUpdate(story1._id, { chapters: chapters1 });
    await Story.findByIdAndUpdate(story2._id, { chapters: chapters2 });
    await Story.findByIdAndUpdate(story3._id, { chapters: chapters3 });

    // Update genres with stories
    await Genre.findByIdAndUpdate(tienHiepGenre._id, {
      $push: { stories: story1._id },
    });

    await Genre.findByIdAndUpdate(kiemHiepGenre._id, {
      $push: { stories: story2._id },
    });

    await Genre.findByIdAndUpdate(doThiGenre._id, {
      $push: { stories: story3._id },
    });

    console.log("Chapters created and relationships updated");
    console.log("Seed data created successfully!");

    process.exit();
  } catch (error) {
    console.error("Error seeding data:", error);
    process.exit(1);
  }
};

seedDB();
