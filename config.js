const mongoose = require("mongoose");

// Configure mongoose for serverless
mongoose.set('strictQuery', false);

const connectDB = async () => {
  // If already connected, return
  if (mongoose.connection.readyState >= 1) {
    console.log("MongoDB already connected");
    return;
  }

  try {
    await mongoose.connect(process.env.ATLAS_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000,
    });
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    throw err; // Throw error to be caught by middleware
  }
};

module.exports = connectDB;
