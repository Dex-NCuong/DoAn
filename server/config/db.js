const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
  try {
    // Thêm options để tránh lỗi kết nối
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // Timeout sau 10s
      socketTimeoutMS: 45000, // Close sockets sau 45s không hoạt động
      family: 4, // Ưu tiên IPv4
    };

    console.log("Đang kết nối đến MongoDB URI:", process.env.MONGODB_URI);
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    console.log(`MongoDB kết nối thành công: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Lỗi kết nối MongoDB: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
};

module.exports = connectDB;
