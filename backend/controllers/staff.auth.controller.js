import Staff from "../models/staff.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { blockToken } from "../utils/tokenBlocklist.js";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Login
export const login = async (req, res) => {
  try {
    const { iiplId, password } = req.body;

    if (!iiplId || !password) {
      return res.status(400).json({ success: false, message: "IIPL ID and Password are required" });
    }

    const staff = await Staff.findOne({ iiplId });
    if (!staff) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (!staff.isActive) {
      return res.status(403).json({ success: false, message: "Account is inactive. Contact Admin." });
    }

    // Check account lockout
    if (staff.lockUntil && staff.lockUntil > Date.now()) {
      const minutesLeft = Math.ceil((staff.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`,
        code: "ACCOUNT_LOCKED",
      });
    }

    const isMatch = await bcrypt.compare(password, staff.password);

    if (!isMatch) {
      const attempts = (staff.failedLoginAttempts || 0) + 1;
      const update = { failedLoginAttempts: attempts };

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        update.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
        update.failedLoginAttempts = 0;
        await Staff.findByIdAndUpdate(staff._id, update);
        return res.status(423).json({
          success: false,
          message: "Account locked for 15 minutes due to too many failed login attempts.",
          code: "ACCOUNT_LOCKED",
        });
      }

      await Staff.findByIdAndUpdate(staff._id, update);
      return res.status(401).json({
        success: false,
        message: `Invalid credentials. ${MAX_FAILED_ATTEMPTS - attempts} attempt(s) remaining.`,
      });
    }

    // Successful login — reset lockout counters
    await Staff.findByIdAndUpdate(staff._id, { failedLoginAttempts: 0, lockUntil: null });

    const token = jwt.sign(
      { id: staff._id, role: "EMPLOYEE", iiplId: staff.iiplId },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      success: true,
      token,
      staff: {
        id: staff._id,
        name: staff.name,
        iiplId: staff.iiplId,
        email: staff.email,
        mobile: staff.mobile,
        profilePicture: staff.profilePicture,
      },
    });
  } catch (error) {
    console.error("Staff Login Error:", error);
    return res.status(500).json({ success: false, message: "Server error during login" });
  }
};

// Logout
export const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (token) {
      const decoded = jwt.decode(token);
      if (decoded?.exp) {
        blockToken(token, decoded.exp);
      }
    }

    return res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("Staff Logout Error:", error);
    return res.status(500).json({ success: false, message: "Server error during logout" });
  }
};

// Verify Session
export const verifySession = async (req, res) => {
  try {
    const staff = await Staff.findById(req.user.id || req.user._id);
    if (!staff) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: staff._id,
        name: staff.name,
        iiplId: staff.iiplId,
        email: staff.email,
        mobile: staff.mobile,
        profilePicture: staff.profilePicture,
        role: "EMPLOYEE",
      },
    });
  } catch (error) {
    console.error("Verify Session Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
