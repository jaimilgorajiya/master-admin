import express from "express";
import {
  createStaff,
  getAllStaff,
  updateStaff,
  toggleStaffStatus,
  deleteStaff,
  resetStaffPassword,
} from "../controllers/staff.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/create", authMiddleware, createStaff);
router.get("/all", authMiddleware, getAllStaff);
router.put("/update/:id", authMiddleware, updateStaff);
router.patch("/toggle-status/:id", authMiddleware, toggleStaffStatus);
router.delete("/delete/:id", authMiddleware, deleteStaff);
router.post("/reset-password/:id", authMiddleware, resetStaffPassword);

export default router;
