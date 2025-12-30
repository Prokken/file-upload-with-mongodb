const express = require("express");
const bodyParser = require("body-parser");
const logger = require("morgan");
const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("./config");
const fileRoutes = require("./routes/fileRoutes");
const fs = require("fs");

dotenv.config();

const app = express();

// Lazy database connection - only connect when needed
let isConnected = false;
const ensureDbConnection = async () => {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }
};

// Middleware for parsing request body and logging requests
app.use(bodyParser.json());
app.use(logger("dev"));

// Middleware to ensure DB connection for API routes
app.use(async (req, res, next) => {
  try {
    await ensureDbConnection();
    next();
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json({ error: "Database connection failed" });
  }
});

// Serve the main HTML file for the root route
app.get("/", (req, res) => {
  const indexPath = path.join(__dirname, "public", "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({ message: "File Upload API with MongoDB - Server is running" });
  }
});

// API Routes
app.use("/", fileRoutes);

// Export the Express app for Vercel
module.exports = app;

// Server listening on port 3001 for incoming requests (for local development)
if (require.main === module) {
  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    console.log(`Visit http://localhost:${port} to access the UI`);
  });
}
