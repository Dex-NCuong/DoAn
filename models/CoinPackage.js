const mongoose = require("mongoose");

const coinPackageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tên gói xu là bắt buộc"],
      trim: true,
    },
    coins: {
      type: Number,
      required: [true, "Số lượng xu là bắt buộc"],
      min: [1, "Số lượng xu phải lớn hơn 0"],
    },
    price: {
      type: Number,
      required: [true, "Giá gói xu là bắt buộc"],
      min: [0, "Giá không thể âm"],
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, "Khuyến mãi không thể âm"],
      max: [100, "Khuyến mãi không thể lớn hơn 100%"],
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    featured: {
      type: Boolean,
      default: false,
    },
    packageId: { type: String, unique: true, required: true },
  },
  { timestamps: true }
);

// Phương thức tính giá thực tế sau khuyến mãi
coinPackageSchema.methods.getActualPrice = function () {
  if (!this.discount) return this.price;
  return Math.round(this.price * (1 - this.discount / 100));
};

// Phương thức tính số tiền tiết kiệm được
coinPackageSchema.methods.getSavedAmount = function () {
  if (!this.discount) return 0;
  return Math.round(this.price * (this.discount / 100));
};

// Phương thức tính giá trị đơn vị (VNĐ/xu)
coinPackageSchema.methods.getUnitValue = function () {
  const actualPrice = this.getActualPrice();
  return this.coins > 0 ? Math.round(actualPrice / this.coins) : 0;
};

module.exports = mongoose.model("CoinPackage", coinPackageSchema);
