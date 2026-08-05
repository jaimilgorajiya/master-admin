import express from "express";
import { register, login, logout } from "../controllers/user.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { loginRateLimiter } from "../middleware/rateLimit.middleware.js";

const router = express.Router();

router.post("/register", loginRateLimiter, register);
router.post("/login", loginRateLimiter, login);
router.post("/logout", authMiddleware, logout);

export default router;
