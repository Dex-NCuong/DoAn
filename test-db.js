const mongoose = require("mongoose");
require("dotenv").config();

// Connect to MongoDB
console.log(
  "Attempting to connect to MongoDB with URI:",
  process.env.MONGODB_URI
);

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB successfully");

    // Test saving a simple document
    const TestSchema = new mongoose.Schema({
      name: String,
      createdAt: { type: Date, default: Date.now },
    });

    const Test = mongoose.model("Test", TestSchema);

    const testDoc = new Test({ name: "test_connection" });
    return testDoc.save();
  })
  .then((result) => {
    console.log("Test document saved successfully:", result);
    console.log("MongoDB connection is working!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("MongoDB connection or save error:", err);
    process.exit(1);
  });
