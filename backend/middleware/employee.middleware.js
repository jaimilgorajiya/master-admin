import jwt from "jsonwebtoken";
import Staff from "../models/staff.model.js";
import { isTokenBlocked } from "../utils/tokenBlocklist.js";

export const employeeAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Invalid token format.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if token has been invalidated (logout)
    if (isTokenBlocked(token)) {
      return res.status(401).json({
        success: false,
        message: "Token has been invalidated. Please login again.",
        code: "TOKEN_REVOKED",
      });
    }

    // Ensure user is Employee
    if (decoded.role !== "EMPLOYEE") {
      return res.status(403).json({
        success: false,
        message: "Forbidden. Employee privileges required.",
      });
    }

    // Check if staff still exists and is active
    const staff = await Staff.findById(decoded.id);
    if (!staff || !staff.isActive) {
      return res.status(401).json({
         success: false,
         message: "Account deactivated or not found. Please contact admin.",
      });
    }

    req.user = decoded;
    next();

  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Your session has expired. Please login again.",
        code: "TOKEN_EXPIRED"
      });
    }
    
    return res.status(401).json({
      success: false,
      message: "Invalid token.",
      code: "INVALID_TOKEN"
    });
  }
};
