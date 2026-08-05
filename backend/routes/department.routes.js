import express from "express";
import {
  createDepartment,
  getAllDepartments,
  updateDepartment,
  toggleDepartmentStatus,
  deleteDepartment,
} from "../controllers/department.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/create", authMiddleware, createDepartment);
router.get("/all", authMiddleware, getAllDepartments);
router.put("/update/:id", authMiddleware, updateDepartment);
router.patch("/toggle-status/:id", authMiddleware, toggleDepartmentStatus);
router.delete("/delete/:id", authMiddleware, deleteDepartment);

export default router;
