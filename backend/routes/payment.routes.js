import express from "express";
import { createOrder, getRazorpayPaymentDetails } from "../controllers/payment.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/create-order", authMiddleware, createOrder);
router.get("/razorpay/:paymentId", authMiddleware, getRazorpayPaymentDetails);

export default router;
