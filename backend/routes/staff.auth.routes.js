import express from "express";
import { login, logout, verifySession } from "../controllers/staff.auth.controller.js";
import { employeeAuthMiddleware } from "../middleware/employee.middleware.js";
import { loginRateLimiter } from "../middleware/rateLimit.middleware.js";

const router = express.Router();

// Public Routes
router.post("/login", loginRateLimiter, login);

// Protected Routes
router.get("/verify", employeeAuthMiddleware, verifySession);
router.post("/logout", employeeAuthMiddleware, logout);

export default router;
