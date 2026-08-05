import express from "express";
import {
  createPosition,
  getAllPositions,
  updatePosition,
  togglePositionStatus,
  deletePosition,
} from "../controllers/position.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/create", authMiddleware, createPosition);
router.get("/all", authMiddleware, getAllPositions);
router.put("/update/:id", authMiddleware, updatePosition);
router.patch("/toggle-status/:id", authMiddleware, togglePositionStatus);
router.delete("/delete/:id", authMiddleware, deletePosition);

export default router;
