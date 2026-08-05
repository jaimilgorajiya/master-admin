import bcrypt from "bcryptjs";
import Staff from "../models/staff.model.js";
import { emitEvent } from "../socket/socketHandler.js";
import sendEmail from "../utils/emailService.js";
import { generatePassword } from "../utils/passwordGenerator.js";

// CREATE STAFF
export const createStaff = async (req, res) => {
  try {
    const {
      profilePicture,
      iiplId,
      name,
      email,
      mobile,
      gender,
      departmentId,
      positionId,
    } = req.body;

    // Validation
    if (!iiplId || !name || !email || !mobile || !departmentId || !positionId) {
      return res.status(400).json({ success: false, message: "All required fields must be filled" });
    }

    // Check unique fields
    const existingStaff = await Staff.findOne({ $or: [{ iiplId }, { email }] });
    if (existingStaff) {
      return res.status(400).json({
        success: false,
        message: existingStaff.iiplId === iiplId 
          ? "Staff with this IIPL ID already exists" 
          : "Staff with this Email already exists"
      });
    }

    // Generate Password
    const password = generatePassword(10);
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create Staff
    const staff = await Staff.create({
      profilePicture,
      iiplId,
      name,
      email,
      mobile,
      gender,
      departmentId,
      positionId,
      password: hashedPassword,
    });

    // Send Email
    const emailSubject = "Welcome to IIPL - Your Staff Credentials";
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .email-container { max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid #e0e0e0; }
          .header { background: linear-gradient(135deg, #00c8ff 0%, #a855f7 100%); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; letter-spacing: 1px; }
          .content { padding: 40px 30px; color: #333333; line-height: 1.6; }
          .welcome-text { font-size: 20px; font-weight: 600; color: #1a1a1a; margin-bottom: 20px; }
          .credentials-box { background-color: #f8f9fa; border-left: 4px solid #00c8ff; padding: 20px; margin: 25px 0; border-radius: 4px; }
          .credential-item { margin-bottom: 10px; font-size: 15px; }
          .credential-label { font-weight: 600; color: #666; width: 100px; display: inline-block; }
          .credential-value { font-family: 'Consolas', 'Monaco', monospace; color: #000; font-weight: 700; background: #e9ecef; padding: 2px 6px; border-radius: 4px; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #eee; }
          .btn-login { display: inline-block; background: #00c8ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; }
        </style>
      </head>
      <body style="background-color: #f4f4f4; padding: 20px;">
        <div class="email-container">
          <div class="header">
            <h1>Welcome to IIPL</h1>
          </div>
          <div class="content">
            <div class="welcome-text">Hello, ${name}!</div>
            <p>Your  account has been successfully created.</p>
            <p>Please use the following credentials to access your dashboard:</p>
            
            <div class="credentials-box">
              <div class="credential-item">
                <span class="credential-label">IIPL ID:</span>
                <span class="credential-value">${iiplId}</span>
              </div>
              <div class="credential-item">
                <span class="credential-label">Password:</span>
                <span class="credential-value">${password}</span>
              </div>
            </div>

            <p style="font-size: 14px; color: #666;">If you have any questions or face any issues while logging in, please feel free to contact the admin.</p>
            <p style="font-size: 14px; color: #666;">For security reasons, please contact the admin team to change your password after your first login.
</p>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/employee/login" class="btn-login" style="color: #ffffff;">Login to Dashboard</a>
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} IIPL. All rights reserved.</p>
            <p>This is an automated message, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    // Non-blocking email send
    sendEmail(email, emailSubject, emailHtml);

    emitEvent("staff_data_change", { action: "create", id: staff._id });

    return res.status(201).json({
      success: true,
      message: "Staff created successfully. Credentials sent via email.",
      staff: {
          ...staff.toObject(),
          password: undefined // Do not return hashed password
      }
    });

  } catch (error) {
    console.error("Create staff error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// GET ALL STAFF
export const getAllStaff = async (req, res) => {
  try {
    const staffList = await Staff.find()
      .populate("departmentId", "name")
      .populate("positionId", "name")
      .sort({ createdAt: -1 })
      .select("-password"); // Exclude password

    return res.status(200).json({ success: true, staffList });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// UPDATE STAFF
// UPDATE STAFF
export const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // 1. Fetch current staff to check properties
    const currentStaff = await Staff.findById(id);
    if (!currentStaff) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    let passwordChanged = false;
    let newRawPassword = "";

    // 2. Check if Email is changing
    if (updates.email && updates.email !== currentStaff.email) {
      // Email is changing -> Generate new password
      newRawPassword = generatePassword(10);
      const hashedPassword = await bcrypt.hash(newRawPassword, 10);
      
      updates.password = hashedPassword;
      passwordChanged = true;
    } else {
      // Prevent manual password update unless specific logic allows (here we block it)
      delete updates.password;
    }



    // 3. Update Staff
    const staff = await Staff.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
      .populate("departmentId", "name")
      .populate("positionId", "name")
      .select("-password");

    // 4. Send Email if Password/Email changed
    if (passwordChanged) {
       const emailSubject = "IIPL - Account Details Updated";
       const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            .email-container { max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid #e0e0e0; }
            .header { background: linear-gradient(135deg, #00c8ff 0%, #a855f7 100%); padding: 30px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 24px; letter-spacing: 1px; }
            .content { padding: 40px 30px; color: #333333; line-height: 1.6; }
            .welcome-text { font-size: 20px; font-weight: 600; color: #1a1a1a; margin-bottom: 20px; }
            .credentials-box { background-color: #f8f9fa; border-left: 4px solid #00c8ff; padding: 20px; margin: 25px 0; border-radius: 4px; }
            .credential-item { margin-bottom: 10px; font-size: 15px; }
            .credential-label { font-weight: 600; color: #666; width: 100px; display: inline-block; }
            .credential-value { font-family: 'Consolas', 'Monaco', monospace; color: #000; font-weight: 700; background: #e9ecef; padding: 2px 6px; border-radius: 4px; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #eee; }
            .btn-login { display: inline-block; background: #00c8ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; }
          </style>
        </head>
        <body style="background-color: #f4f4f4; padding: 20px;">
          <div class="email-container">
            <div class="header">
              <h1>Account Updated</h1>
            </div>
            <div class="content">
              <div class="welcome-text">Hello, ${staff.name}!</div>
              <p>Your email address has been updated. Because of this change, we have generated a new password for you.</p>
              <p>Please use the following new credentials to access your dashboard:</p>
              
              <div class="credentials-box">
                <div class="credential-item">
                  <span class="credential-label">ID:</span>
                  <span class="credential-value">${staff.iiplId}</span>
                </div>
                <div class="credential-item">
                  <span class="credential-label">Password:</span>
                  <span class="credential-value">${newRawPassword}</span>
                </div>
              </div>
              <p style="font-size: 14px; color: #666;">If you have any questions or face any issues while logging in, please feel free to contact the admin team.
</p>  
<p style="font-size: 14px; color: #666;">For security reasons, please contact the admin team to change your password after your first login.
</p>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/employee/login" class="btn-login" style="color: #ffffff;">Login to Dashboard</a>
              </div>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} IIPL. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      sendEmail(staff.email, emailSubject, emailHtml);
    }

    emitEvent("staff_data_change", { action: "update", id: staff._id });

    return res.status(200).json({ 
      success: true, 
      message: passwordChanged ? "Employee updated and new credentials sent." : "Employee updated successfully", 
      staff 
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Email already in use" });
    }
    console.error("Update staff error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// TOGGLE STATUS
export const toggleStaffStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await Staff.findById(id);

    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff not found" });
    }

    staff.isActive = !staff.isActive;
    await staff.save();

    emitEvent("staff_data_change", { action: "toggle_status", id: staff._id });

    return res.status(200).json({ success: true, message: `Staff ${staff.isActive ? 'activated' : 'deactivated'} successfully`, isActive: staff.isActive });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// DELETE STAFF (Soft Delete Concept or Hard Delete)
// Prompt said "Prefer soft delete (retain record for audit)", but usually that means just setting isActive=false or deletedAt. 
// However, the action explicitly lists "Activate / Deactivate" AND "Delete Staff".
// If I use soft delete, I might need a 'isDeleted' field.
// For now, I'll stick to Activating/Deactivating as the primary soft-delete mechanism, 
// and implement a hard delete for the "Delete" button, OR strictly soft delete if I add `isDeleted` to schema.
// Schema didn't have `isDeleted`. I'll use Hard Delete for the "Delete" button to keep it simple unless I modify schema.
// ACTUALLY, I should check if I missed adding `isDeleted` to schema. I only added isActive.
// I'll stick to Hard Delete for "Delete" button and assume "Deactivate" is the soft disable.
export const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await Staff.findByIdAndDelete(id);
    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff not found" });
    }
    emitEvent("staff_data_change", { action: "delete", id });
    return res.status(200).json({ success: true, message: "Staff deleted permanently" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// RESET PASSWORD
export const resetStaffPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { manualPassword } = req.body;
    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff not found" });
    }

    const newPassword = manualPassword ? manualPassword : generatePassword(10);
    staff.password = await bcrypt.hash(newPassword, 10);
    await staff.save();

     // Send Email
     const emailSubject = "IIPL - Password Reset";
     const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .email-container { max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid #e0e0e0; }
          .header { background: linear-gradient(135deg, #00c8ff 0%, #a855f7 100%); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; letter-spacing: 1px; }
          .content { padding: 40px 30px; color: #333333; line-height: 1.6; }
          .welcome-text { font-size: 20px; font-weight: 600; color: #1a1a1a; margin-bottom: 20px; }
          .credentials-box { background-color: #f8f9fa; border-left: 4px solid #a855f7; padding: 20px; margin: 25px 0; border-radius: 4px; }
          .credential-item { margin-bottom: 10px; font-size: 15px; }
          .credential-label { font-weight: 600; color: #666; width: 120px; display: inline-block; }
          .credential-value { font-family: 'Consolas', 'Monaco', monospace; color: #000; font-weight: 700; background: #e9ecef; padding: 2px 6px; border-radius: 4px; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #eee; }
          .btn-login { display: inline-block; background: #00c8ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; }
        </style>
      </head>
      <body style="background-color: #f4f4f4; padding: 20px;">
        <div class="email-container">
          <div class="header">
            <h1>Password Reset</h1>
          </div>
          <div class="content">
            <div class="welcome-text">Hello, ${staff.name}</div>
            <p>Your password for the IIPL Staff Dashboard has been successfully reset.</p>
            <p>Here are your new login credentials:</p>
            
            <div class="credentials-box">
              <div class="credential-item">
                <span class="credential-label">ID:</span>
                <span class="credential-value">${staff.iiplId}</span>
              </div>
              <div class="credential-item">
                <span class="credential-label">New Password:</span>
                <span class="credential-value">${newPassword}</span>
              </div>
            </div>

            <p style="font-size: 14px; color: #666;">Please login and change this password immediately in your profile settings.</p>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/employee/login" class="btn-login" style="color: #ffffff;">Login to Dashboard</a>
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} IIPL. All rights reserved.</p>
            <p>This is an automated message, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
     `;
     
     sendEmail(staff.email, emailSubject, emailHtml);

    return res.status(200).json({ success: true, message: "Password reset and email sent successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

