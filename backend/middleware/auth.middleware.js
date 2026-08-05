import jwt from "jsonwebtoken";
import { isTokenBlocked } from "../utils/tokenBlocklist.js";

export const authMiddleware = (req, res, next) => {
  try {
    // ✅ Check if Authorization header exists
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    // ✅ Extract token ("Bearer <token>")
    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Invalid token format.",
      });
    }

    // ✅ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Check if token has been invalidated (logout)
    if (isTokenBlocked(token)) {
      return res.status(401).json({
        success: false,
        message: "Token has been invalidated. Please login again.",
        code: "TOKEN_REVOKED",
      });
    }

    // ✅ Ensure user is Master Admin or Employee
    if (decoded.role !== "MASTER_ADMIN" && decoded.role !== "EMPLOYEE") {
      return res.status(403).json({
        success: false,
        message: "Forbidden. Authorized personnel only.",
      });
    }

    // ✅ Attach decoded payload to request
    req.user = decoded;

    next(); // proceed to controller

  } catch (error) {
    console.error("Auth Middleware Error:", error.name);
    
    // Handle specific JWT errors
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Your session has expired. Please login again.",
        code: "TOKEN_EXPIRED"
      });
    }
    
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token. Please login again.",
        code: "INVALID_TOKEN"
      });
    }
    
    return res.status(401).json({
      success: false,
      message: "Authentication failed. Please login again.",
      code: "AUTH_FAILED"
    });
  }
};
