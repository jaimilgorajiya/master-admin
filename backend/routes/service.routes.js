import express from "express";
import {
  createService,
  getAllServices,
  updateService,
  deleteService,
  toggleServiceStatus,
} from "../controllers/service.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

// Protected routes
router.post("/create", authMiddleware, createService);
router.get("/all", authMiddleware, getAllServices);
router.put("/update/:id", authMiddleware, updateService);
router.patch("/toggle-status/:id", authMiddleware, toggleServiceStatus);
router.delete("/delete/:id", authMiddleware, deleteService);

export default router;
