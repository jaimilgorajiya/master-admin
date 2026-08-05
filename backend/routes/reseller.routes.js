import express from "express";
const router = express.Router();
import { createReseller, getAllResellers, getResellerProfile, updateReseller, deleteReseller } from "../controllers/reseller.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

router.post("/create", authMiddleware, createReseller);
router.get("/all", authMiddleware, getAllResellers);
router.get("/:id/profile", authMiddleware, getResellerProfile);
router.put("/:id", authMiddleware, updateReseller);
router.delete("/:id", authMiddleware, deleteReseller);

export default router;
