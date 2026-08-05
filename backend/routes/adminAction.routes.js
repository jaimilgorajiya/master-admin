import express from "express";
import { getRevenue } from "../controllers/adminAction.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { employeeAuthMiddleware } from "../middleware/employee.middleware.js";
import { getEmployeeRevenue } from "../controllers/adminAction.controller.js";

const router = express.Router();

router.get("/revenue", authMiddleware, getRevenue);
router.get("/employee-revenue", employeeAuthMiddleware, getEmployeeRevenue);

export default router;
