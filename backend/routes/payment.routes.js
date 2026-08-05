import express from "express";
import { createOrder } from "../controllers/payment.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/create-order", authMiddleware, createOrder);

export default router;
