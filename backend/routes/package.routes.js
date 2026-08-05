import express from "express";
import { createPackage, getPackages, deletePackage, togglePackageStatus, updatePackage } from "../controllers/package.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/create", authMiddleware, createPackage);
router.get("/all", authMiddleware, getPackages);
router.delete("/delete/:id", authMiddleware, deletePackage);
router.patch("/toggle-status/:id", authMiddleware, togglePackageStatus);
router.put("/update/:id", authMiddleware, updatePackage);

export default router;
