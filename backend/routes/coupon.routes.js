import express from "express";
import { createCoupon, getAllCoupons, toggleStatus, deleteCoupon, validateCoupon, updateCoupon } from "../controllers/coupon.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

// Admin routes
router.post("/create", authMiddleware, createCoupon);
router.get("/all", authMiddleware, getAllCoupons);
router.patch("/toggle/:id", authMiddleware, toggleStatus);
router.delete("/:id", authMiddleware, deleteCoupon);
router.put("/:id", authMiddleware, updateCoupon);

// Public validation route
router.post("/validate", validateCoupon);

export default router;
