import jwt from "jsonwebtoken";
import { isTokenBlocked } from "../utils/tokenBlocklist.js";

export const resellerAuthMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(" ")[1];
        if (!token) return res.status(401).json({ success: false, message: "No token provided" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (isTokenBlocked(token)) return res.status(401).json({ success: false, message: "Token revoked" });

        if (decoded.role !== "RESELLER" && decoded.role !== "RESELLER_EMPLOYEE") {
            return res.status(403).json({ success: false, message: "Access denied: Resellers only" });
        }

        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: "Auth failed" });
    }
};

export const onlyResellerAdmin = (req, res, next) => {
    if (req.user.role !== "RESELLER") {
        return res.status(403).json({ success: false, message: "Reseller owner access required" });
    }
    next();
};
