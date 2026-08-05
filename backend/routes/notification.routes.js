import express from "express";
import { getMyNotifications, markAsRead, markAllAsRead } from "../controllers/notification.controller.js";
import { employeeAuthMiddleware } from "../middleware/employee.middleware.js";

const router = express.Router();

// Routes protected by employee middleware (assuming notifications are primarily for employees for now)
router.get("/my-notifications", employeeAuthMiddleware, getMyNotifications);
router.patch("/:id/read", employeeAuthMiddleware, markAsRead);
router.patch("/read-all", employeeAuthMiddleware, markAllAsRead);

export default router;
