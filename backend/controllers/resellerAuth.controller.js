import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Reseller from "../models/reseller.model.js";
import ResellerEmployee from "../models/resellerEmployee.model.js";
import { blockToken } from "../utils/tokenBlocklist.js";

// RELSELLER LOGIN
export const resellerLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: "Email and Password required" });

    const reseller = await Reseller.findOne({ email: email.toLowerCase().trim() });
    if (!reseller) return res.status(401).json({ success: false, message: "Invalid credentials" });

    if (reseller.status !== "Active") return res.status(403).json({ success: false, message: "Reseller account suspended" });

    const isMatch = await bcrypt.compare(password, reseller.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign(
      { id: reseller._id, role: "RESELLER", email: reseller.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: reseller._id,
        name: reseller.name,
        companyName: reseller.companyName,
        email: reseller.email,
        role: "RESELLER"
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Login error" });
  }
};

// RESELLER EMPLOYEE LOGIN
export const resellerEmployeeLogin = async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ success: false, message: "Email and Password required" });
  
      const employee = await ResellerEmployee.findOne({ email: email.toLowerCase().trim() }).populate('resellerId');
      if (!employee) return res.status(401).json({ success: false, message: "Invalid credentials" });
  
      if (employee.status !== "Active") return res.status(403).json({ success: false, message: "Employee account suspended" });
      if (employee.resellerId?.status !== "Active") return res.status(403).json({ success: false, message: "Reseller partner suspended" });

      const isMatch = await bcrypt.compare(password, employee.password);
      if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials" });
  
      const token = jwt.sign(
        { id: employee._id, resellerId: employee.resellerId._id, role: "RESELLER_EMPLOYEE", email: employee.email },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );
  
      return res.status(200).json({
        success: true,
        token,
        user: {
          id: employee._id,
          name: employee.name,
          resellerId: employee.resellerId._id,
          email: employee.email,
          role: "RESELLER_EMPLOYEE",
          assignedServices: employee.assignedServices,
          assignedSoftware: employee.assignedSoftware
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: "Login error" });
    }
};

// LOGOUT
export const logout = async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];
    if (token) {
      const decoded = jwt.decode(token);
      if (decoded?.exp) blockToken(token, decoded.exp);
    }
    return res.status(200).json({ success: true, message: "Logged out" });
};
