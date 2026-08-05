import express from "express";
import { proxyExternalRequest } from "../controllers/proxy.controller.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// Middleware that allows ANY authenticated user (Admin, Employee, Reseller)
const anyAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(" ")[1];
        if (!token) return res.status(401).json({ success: false, message: "Authorized personnel only" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Define all allowed roles
        const allowedRoles = ["MASTER_ADMIN", "EMPLOYEE", "RESELLER", "RESELLER_EMPLOYEE"];
        
        if (!allowedRoles.includes(decoded.role)) {
            return res.status(403).json({ success: false, message: "Forbidden. Access denied." });
        }

        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: "Authentication failed" });
    }
};

// Now allowed for both Admin and Resellers
router.post("/external", anyAuth, proxyExternalRequest);

export default router;
