const express = require("express");
require("dotenv").config();
const cors = require("cors");
const connectDB = require("./source/config/database");
const app = express();
const loginRoutes = require("./source/routes/common/loginRoutes");
const lecturerRoutes = require("./source/routes/lectuer/index.check.routes");
const studentRoutes = require("./source/routes/student/index.check.routes");
const adminRoutes = require("./source/routes/admin/index.check.routes");

// CORS configuration - cho phép FE kết nối
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL, // Vercel URL
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now during development
    }
  },
  credentials: true
}));

// Tăng limit cho body size (face data khá lớn)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connect to Database
connectDB();

// Health check endpoint for Render
app.get("/", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "Smart Attendance API is running",
    timestamp: new Date().toISOString()
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "healthy" });
});

// API Routes
app.use("/api", loginRoutes);
app.use("/api/lecturer", lecturerRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/admin", adminRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!", error: err.message });
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on port ${port}`);
});
