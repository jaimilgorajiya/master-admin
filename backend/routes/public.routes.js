import express from "express";
import { getPublicServiceInfo, processRenewal } from "../controllers/public.controller.js";

const router = express.Router();

// Public renewal routes disabled as per request
// router.get("/client-info", getPublicServiceInfo);
// router.post("/process-renewal", processRenewal);

export default router;
