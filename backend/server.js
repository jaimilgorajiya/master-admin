// Master Admin Backend Server
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import { generalRateLimiter } from "./middleware/rateLimit.middleware.js";

// Routes
import authRoutes from "./routes/user.route.js";
import clientRoutes from "./routes/client.routes.js";
import departmentRoutes from "./routes/department.routes.js";
import positionRoutes from "./routes/position.routes.js";
import staffRoutes from "./routes/staff.routes.js";
import staffAuthRoutes from "./routes/staff.auth.routes.js";
import packageRoutes from "./routes/package.routes.js";
import publicRoutes from "./routes/public.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import serviceRoutes from "./routes/service.routes.js";
import softwareRoutes from "./routes/software.routes.js";
import proxyRoutes from "./routes/proxy.routes.js";
import taskRoutes from "./routes/task.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import softwareClientRoutes from "./routes/softwareClient.routes.js";
import couponRoutes from "./routes/coupon.routes.js";
import resellerRoutes from "./routes/reseller.routes.js";
import resellerAuthRoutes from "./routes/resellerAuth.routes.js";
import resellerActionRoutes from "./routes/resellerAction.routes.js";
import adminActionRoutes from "./routes/adminAction.routes.js";
import resellerEarningsRoutes from "./routes/resellerEarnings.routes.js";
import { startCronJobs } from "./utils/cronJobs.js";

dotenv.config();
const app = express();

// ===============================
// Middleware
// ===============================
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : ["http://localhost:5173", "http://localhost:3000", "https://masteradmin.ifloriana.com"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true
}));

app.use(generalRateLimiter);

// Static uploads
import path from "path";
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Database Connection
connectDB();
// Cron jobs disabled as per request
// startCronJobs();

// ===============================
// API Routes
// ===============================

// ✅ Master Admin Register/Login
app.use("/api/auth", authRoutes);

// ✅ Employee Login/Auth
app.use("/api/staff-auth", staffAuthRoutes);

// ✅ Service Management
app.use("/api/service", serviceRoutes);

// ✅ Client Credential Creation + Listing
app.use("/api/client", clientRoutes);

// ✅ Staff Management (Department, Position, Staff)
app.use("/api/department", departmentRoutes);
app.use("/api/position", positionRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/package", packageRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/software", softwareRoutes);
app.use("/api/proxy", proxyRoutes);
app.use("/api/task", taskRoutes);
app.use("/api/notification", notificationRoutes);
app.use("/api/software-clients", softwareClientRoutes);
app.use("/api/coupon", couponRoutes);
app.use("/api/reseller", resellerRoutes);
app.use("/api/reseller-auth", resellerAuthRoutes);
app.use("/api/reseller-actions", resellerActionRoutes);
app.use("/api/admin-actions", adminActionRoutes);
app.use("/api/reseller-earnings", resellerEarningsRoutes);

// Health Check
app.get("/api/public/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// ===============================
// Default Route
// ===============================
app.get("/", (req, res) => {
  res.send("Master Admin Backend is running...");
});

// ===============================
// Server Listen
// ===============================
import { createServer } from "http";
import { initSocket } from "./socket/socketHandler.js";

const httpServer = createServer(app);
initSocket(httpServer);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
});
