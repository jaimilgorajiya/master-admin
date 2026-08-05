import express from "express";
import { getSoftwares } from "../controllers/software.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/all", authMiddleware, getSoftwares);

export default router;
