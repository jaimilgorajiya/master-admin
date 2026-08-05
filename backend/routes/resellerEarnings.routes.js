import express from "express";
const router = express.Router();
import { 
  getResellerEarningsSummary, 
  processPayout, 
  getMyEarnings,
  updateMarginConfig
} from "../controllers/resellerEarnings.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { resellerAuthMiddleware } from "../middleware/resellerAuth.middleware.js";

// Admin Routes
router.get("/summary", authMiddleware, getResellerEarningsSummary);
router.post("/payout", authMiddleware, processPayout);
router.put("/margin-config/:id", authMiddleware, updateMarginConfig);

// Reseller Routes
router.get("/my-earnings", resellerAuthMiddleware, getMyEarnings);

export default router;
