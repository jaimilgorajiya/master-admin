import bcrypt from "bcryptjs";
import Reseller from "../models/reseller.model.js";
import sendEmail from "../utils/emailService.js";
import { generatePassword } from "../utils/passwordGenerator.js";
import { emitEvent } from "../socket/socketHandler.js";

// CREATE RESELLER (BY MASTER ADMIN)
export const createReseller = async (req, res) => {
  try {
    const { name, email, phone, companyName, address, allowedServices, allowedSoftware, marginConfig } = req.body;

    if (!name || !email || !phone || !companyName) {
      return res.status(400).json({ success: false, message: "All required fields must be filled" });
    }

    const existingReseller = await Reseller.findOne({ email: email.toLowerCase().trim() });
    if (existingReseller) {
      return res.status(400).json({ success: false, message: "Reseller with this email already exists" });
    }

    const rawPassword = generatePassword(10);
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const reseller = await Reseller.create({
      name,
      email: email.toLowerCase().trim(),
      phone,
      companyName,
      address,
      password: hashedPassword,
      allowedServices: allowedServices || [],
      allowedSoftware: allowedSoftware || [],
      marginConfig: marginConfig || { mode: 'overall', overall: { type: 'percentage', value: 0 } }
    });

    // Send Credentials Email
    const emailSubject = "Reseller Account Created - IIPL";
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .email-container { max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', sans-serif; background-color: #ffffff; border-radius: 12px; border: 1px solid #e0e0e0; overflow: hidden; }
          .header { background: linear-gradient(135deg, #a855f7 0%, #00c8ff 100%); padding: 30px; text-align: center; color: white; }
          .content { padding: 40px; color: #333; line-height: 1.6; }
          .creds-box { background: #f8f9fa; border-left: 4px solid #00c8ff; padding: 20px; border-radius: 4px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #888; font-size: 12px; }
          .btn { display: inline-block; background: #00c8ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header"><h1>Reseller Access Granted</h1></div>
          <div class="content">
            <p>Hello <strong>${name}</strong>,</p>
            <p>Your reseller account has been successfully created. You can now access your dedicated reseller panel.</p>
            <div class="creds-box">
              <p><strong>Login URL:</strong> ${process.env.FRONTEND_URL}/reseller/login</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Password:</strong> ${rawPassword}</p>
            </div>
            <p>For security, please change your password upon your first login.</p>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL}/reseller/login" class="btn" style="color:#ffffff;">Go to Reseller Panel</a>
            </div>
          </div>
          <div class="footer"><p>&copy; ${new Date().getFullYear()} IIPL. All rights reserved.</p></div>
        </div>
      </body>
      </html>
    `;

    sendEmail(email, emailSubject, emailHtml);
    emitEvent("reseller_data_change", { action: "create", id: reseller._id });

    return res.status(201).json({ success: true, message: "Reseller created successfully", reseller });
  } catch (error) {
    console.error("Create reseller error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET ALL RESELLERS
export const getAllResellers = async (req, res) => {
  try {
    const list = await Reseller.find()
      .populate("allowedServices", "name")
      .populate("allowedSoftware", "name")
      .sort({ createdAt: -1 })
      .select("-password");
    return res.status(200).json({ success: true, list });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET SINGLE RESELLER WITH CLIENTS
export const getResellerProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const reseller = await Reseller.findById(id)
      .populate("allowedServices", "name")
      .populate("allowedSoftware", "name")
      .select("-password");

    if (!reseller) return res.status(404).json({ success: false, message: "Reseller not found" });

    // All clients created by this reseller (SoftwareClient only — resellers create software clients)
    const SoftwareClient = (await import("../models/softwareClient.model.js")).default;

    const clients = await SoftwareClient.find({ createdByReseller: id })
      .populate("softwareId", "name")
      .populate("createdByResellerEmployee", "name")
      .select("ownerName businessName email phone paymentStatus paymentAmount isActive createdAt softwareId softwareName packageName createdByResellerEmployee")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, reseller, clients });
  } catch (error) {
    console.error("getResellerProfile error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// UPDATE RESELLER
export const updateReseller = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Don't allow password update via this route
    delete updates.password;

    const reseller = await Reseller.findByIdAndUpdate(id, updates, { new: true })
      .populate("allowedServices", "name")
      .populate("allowedSoftware", "name")
      .select("-password");

    if (!reseller) return res.status(404).json({ success: false, message: "Reseller not found" });

    emitEvent("reseller_data_change", { action: "update", id: reseller._id });
    return res.status(200).json({ success: true, reseller });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// DELETE RESELLER
export const deleteReseller = async (req, res) => {
  try {
    const { id } = req.params;
    const reseller = await Reseller.findByIdAndDelete(id);
    if (!reseller) return res.status(404).json({ success: false, message: "Reseller not found" });

    emitEvent("reseller_data_change", { action: "delete", id });
    return res.status(200).json({ success: true, message: "Reseller deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
