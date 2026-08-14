import Details from "../models/client.model.js";
import Package from "../models/package.model.js";
import Service from "../models/service.model.js";
import Transaction from "../models/transaction.model.js";
import nodemailer from "nodemailer";
import axios from "axios";
import mongoose from "mongoose";
import SoftwareClient from "../models/softwareClient.model.js";
import { validateCouponLogic } from "../utils/couponHelper.js";
import { emitEvent } from "../socket/socketHandler.js";

// ✅ Get Client History
export const getClientHistory = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Find local client document if using external ID
        const clientDoc = mongoose.isValidObjectId(id)
          ? (await SoftwareClient.findById(id) || await SoftwareClient.findOne({ externalClientId: id }))
          : await SoftwareClient.findOne({ externalClientId: id });
          
        const targetId = clientDoc ? clientDoc._id : id;

        // Security check for Resellers and Reseller Employees
        if (req.user.role === "RESELLER" || req.user.role === "RESELLER_EMPLOYEE") {
            if (!clientDoc) {
                return res.status(403).json({ success: false, message: "Forbidden. Client not found or not owned by you." });
            }
            const isEmployee = req.user.role === "RESELLER_EMPLOYEE";
            const resellerId = isEmployee ? req.user.resellerId : req.user.id;
            const employeeId = isEmployee ? req.user.id : null;

            const isOwner = String(clientDoc.createdByReseller) === String(resellerId);
            const isEmpOwner = !isEmployee || String(clientDoc.createdByResellerEmployee) === String(employeeId);

            if (!isOwner || !isEmpOwner) {
                return res.status(403).json({ success: false, message: "Forbidden. You do not own this client." });
            }
        }

        // 1. Check Transaction model (Regular clients)
        const transactions = await Transaction.find({ clientId: targetId })
            .populate("packageId", "name price durationDays unit")
            .sort({ createdAt: -1 });

        if (transactions.length > 0) {
            const enriched = transactions.map(t => {
                const plain = t.toObject();
                if (clientDoc) {
                    plain.packageName = plain.packageName || clientDoc.packageName;
                }
                return plain;
            });
            return res.status(200).json({ success: true, history: enriched });
        }

        // 2. Check SoftwareClient model (Reseller-created clients)
        const client = clientDoc || (mongoose.isValidObjectId(id) ? await SoftwareClient.findById(id) : null);

        if (client && client.paymentStatus === 'completed') {
            // Synthesize a transaction object compatible with the frontend
            const synthTx = [{
                _id: client._id,
                createdAt: client.paymentDate || client.createdAt,
                amount: client.paymentAmount,
                paymentId: client.transactionId || "MANUAL",
                status: "completed",
                packageName: client.packageName, // Additional field for UI
                packageId: { 
                    name: client.packageName || "Service Package",
                    durationDays: client.validityPeriod ? parseInt(client.validityPeriod) : 0,
                    unit: "Days"
                }
            }];
            return res.status(200).json({ success: true, history: synthTx });
        }

        return res.status(200).json({
            success: true,
            history: []
        });
    } catch (error) {
        console.error("Get history error", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

// ✅ password generator utility
const generatePassword = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@$!%*?";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

// ✅ CREATE CLIENT (generate password, send email, etc.)
export const createClient = async (req, res) => {
  try {
    const { clientName, clientEmail, clientPhone, clientType, serviceIds, packageId, packageIds, validityPeriod, discountAmount, couponCode } = req.body;

    const type = clientType || "service";

    // ... same validation logic ...
    const errors = [];
    if (!clientName || typeof clientName !== 'string' || !clientName.trim()) errors.push("Client Name is required");
    if (!clientEmail || typeof clientEmail !== 'string' || !clientEmail.trim()) errors.push("Client Email is required");
    if (!clientPhone || !clientPhone.trim()) errors.push("Client Phone is required");

    if (errors.length > 0) {
        console.warn("⚠️ Validation Failed:", errors);
        return res.status(400).json({ success: false, message: errors.join(", ") });
    }

    // --- 2. Sanitize IDs (Prevent CastError for empty strings) ---
    const cleanId = (id) => (id && typeof id === 'string' && id.trim() !== "" && id !== "null" && id !== "undefined") ? id.trim() : undefined;
    
    const validPackageId = cleanId(packageId);
    let validServiceIds = [];
    let validPackageIds = [];

    if (Array.isArray(serviceIds)) {
        validServiceIds = serviceIds.map(cleanId).filter(id => id !== undefined);
    } else if (typeof serviceIds === 'string') {
         const cleaned = cleanId(serviceIds);
         if (cleaned) validServiceIds = [cleaned];
    }

    if (Array.isArray(packageIds)) {
        validPackageIds = packageIds.map(cleanId).filter(id => id !== undefined);
    } else if (typeof packageIds === 'string') {
         const cleaned = cleanId(packageIds);
         if (cleaned) validPackageIds = [cleaned];
    }

    // --- 3. Validate Type-Specific Relations ---
    if (type === "service") {
        if (validServiceIds.length === 0 && validPackageIds.length === 0) {
            return res.status(400).json({ success: false, message: "Please select at least one Service OR a Package" });
        }
    } else {
         return res.status(400).json({ success: false, message: "Invalid client type" });
    }

    // --- 4. Check for Duplicates ---
    const existingClient = await Details.findOne({ clientEmail });
    if (existingClient) {
      console.warn(`⚠️ Duplicate Email: ${clientEmail}`);
      return res.status(400).json({
        success: false,
        message: "Client with this email already exists",
        client: existingClient,
      });
    }

    let registrationStatus = "success";
    const generatedPassword = generatePassword();

    // --- 8. Validation Period Logic ---
    const now = new Date();
    let expiryDate = new Date(now);
    let validityPeriodString = validityPeriod || "30 Days";
    
    if (validPackageIds && validPackageIds.length > 0) {
        try {
            const selectedPackages = await Package.find({ _id: { $in: validPackageIds } });
            
            if (selectedPackages.length > 0) {
                // Calculate max expiry and concat names
                let maxExpiryTime = now.getTime();
                const packageNames = [];

                selectedPackages.forEach(pkg => {
                    packageNames.push(pkg.name);
                    
                    const pDate = new Date(now);
                    const value = pkg.durationDays;
                    const unit = pkg.unit || 'days';

                    if (unit === 'minutes') pDate.setMinutes(now.getMinutes() + value);
                    else if (unit === 'days') pDate.setDate(now.getDate() + value);
                    else if (unit === 'months') pDate.setMonth(now.getMonth() + value);
                    else if (unit === 'years') pDate.setFullYear(now.getFullYear() + value);
                    else if (unit === 'one-time') pDate.setFullYear(now.getFullYear() + 99);
                    else pDate.setDate(now.getDate() + value);
                    
                    if (pDate.getTime() > maxExpiryTime) {
                        maxExpiryTime = pDate.getTime();
                    }
                });

                expiryDate = new Date(maxExpiryTime);
                validityPeriodString = packageNames.join(", ");
            }
        } catch (err) {
             console.error("⚠️ Error fetching packages for multi-select:", err);
        }
    } 
    else if (validPackageId) {
      try {
        const selectedPackage = await Package.findById(validPackageId);
        if (selectedPackage) {
          const value = selectedPackage.durationDays;
          const unit = selectedPackage.unit || 'days';
          
          if (unit === 'minutes') expiryDate.setMinutes(now.getMinutes() + value);
          else if (unit === 'days') expiryDate.setDate(now.getDate() + value);
          else if (unit === 'months') expiryDate.setMonth(now.getMonth() + value);
          else if (unit === 'years') expiryDate.setFullYear(now.getFullYear() + value);
          else if (unit === 'one-time') expiryDate.setFullYear(now.getFullYear() + 99);
          else expiryDate.setDate(now.getDate() + value); 
          
          validityPeriodString = selectedPackage.name; 
        }
      } catch(err) {
        console.error("⚠️ Error fetching package:", err);
      }
    } else {
        // No package selected — use service duration if available
        if (validServiceIds.length > 0) {
            try {
                const selectedServices = await Service.find({ _id: { $in: validServiceIds } });
                if (selectedServices.length > 0) {
                    // Use the longest duration among selected services
                    let maxExpiryTime = now.getTime();
                    const serviceNames = [];
                    selectedServices.forEach(svc => {
                        serviceNames.push(svc.name);
                        const pDate = new Date(now);
                        const value = svc.duration || 1;
                        const unit = svc.durationUnit || 'months';
                        if (unit === 'months') pDate.setMonth(now.getMonth() + value);
                        else if (unit === 'one-time') pDate.setFullYear(now.getFullYear() + 99);
                        else if (unit === 'lifetime') pDate.setFullYear(now.getFullYear() + 99);
                        if (pDate.getTime() > maxExpiryTime) maxExpiryTime = pDate.getTime();
                    });
                    expiryDate = new Date(maxExpiryTime);
                    validityPeriodString = serviceNames.join(", ");
                } else {
                    expiryDate.setDate(now.getDate() + 30);
                }
            } catch (err) {
                console.error("⚠️ Error fetching services for expiry:", err);
                expiryDate.setDate(now.getDate() + 30);
            }
        } else {
            expiryDate.setDate(now.getDate() + 30);
        }
    }

    // --- 9. DETAILS & PAYMENT CALCULATION ---
    let totalPaymentAmount = 0;

    if (validServiceIds.length > 0) {
        try {
            const selectedServices = await Service.find({ _id: { $in: validServiceIds } });
            const serviceTotal = selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);
            totalPaymentAmount += serviceTotal;
        } catch (err) {
            console.error("⚠️ Error calculating service total:", err);
        }
    }

    if (validPackageIds.length > 0) {
        try {
            const selectedPackages = await Package.find({ _id: { $in: validPackageIds } });
            const packageTotal = selectedPackages.reduce((sum, p) => sum + (p.price || 0), 0);
            totalPaymentAmount += packageTotal;
        } catch (err) {
            console.error("⚠️ Error calculating package total:", err);
        }
    } else if (validPackageId) {
        try {
            const pkg = await Package.findById(validPackageId);
            if (pkg) {
                totalPaymentAmount += (pkg.price || 0);
            }
        } catch (err) {
            console.error("⚠️ Error calculating package total:", err);
        }
    }

    // Apply Coupon if provided
    let discountAmountValue = 0;
    let appliedCouponId = null;
    
    if (couponCode) {
        const couponResult = await validateCouponLogic(
            couponCode, 
            null, 
            validServiceIds, 
            totalPaymentAmount
        );
        
        if (couponResult.success) {
            discountAmountValue = couponResult.discount;
            totalPaymentAmount = couponResult.finalAmount;
            appliedCouponId = couponResult.coupon._id;
        } else {
            return res.status(400).json({ success: false, message: couponResult.message });
        }
    } else if (discountAmount && !isNaN(discountAmount)) {
        // Fallback for manual discount if no coupon code but discountAmount passed (legacy or manual override)
        discountAmountValue = parseFloat(discountAmount);
        totalPaymentAmount = Math.max(0, totalPaymentAmount - discountAmountValue);
    }

    const initialStatus = type === 'service' ? false : true;

    // Capture Creator Info
    const creatorId = req.user ? (req.user.id || req.user.userId || req.user._id) : null;
    const creatorType = (req.user && (req.user.role === 'MASTER_ADMIN' || req.user.role === 'admin')) ? 'User' : 'Staff';

    let creatorIdObjectId = null;
    if (creatorId) {
      try {
        creatorIdObjectId = typeof creatorId === 'string' ? new mongoose.Types.ObjectId(creatorId) : creatorId;
      } catch (error) {
        creatorIdObjectId = creatorId;
      }
    }

    const clientData = {
      clientName,
      clientEmail,
      clientPhone,
      serviceIds: validServiceIds,
      clientType: type,
      packageId: validPackageId,
      packageIds: validPackageIds,
      generatedPassword, 
      registrationStatus,
      validityPeriod: validityPeriodString,
      expiryDate: expiryDate,
      isActive: initialStatus,
      createdBy: creatorIdObjectId,
      createdByType: creatorType,
      paymentAmount: totalPaymentAmount,
      couponCode: couponCode,
      discountAmount: discountAmountValue,
      appliedCoupon: appliedCouponId
    };

    const clientRecord = await Details.create(clientData);

    emitEvent("client_data_change", { action: "create", id: clientRecord._id, createdBy: clientRecord.createdBy });

    // --- 10. Send Email ---
    if (type === 'service') {
        const paymentLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pay-service/${clientRecord._id}`;
        try {
            if (process.env.SMTP_USER && process.env.SMTP_PASS) {
                const transporter = nodemailer.createTransport({
                    service: "gmail",
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS 
                    }
                });

                const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e1e1e1; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #007bff; padding: 20px; text-align: center; color: white;">
                        <h2 style="margin: 0;">Activate Your Service Account</h2>
                    </div>
                    <div style="padding: 30px; color: #333;">
                        <p>Dear <strong>${clientName}</strong>,</p>
                        <p>Your service account has been created. Please complete your payment to activate your services.</p>
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 25px 0; border-left: 4px solid #007bff;">
                            <p style="margin:0 0 10px 0;font-weight:bold;color:#555;">Account Summary</p>
                            <p style="margin:4px 0"><strong>Client Name:</strong> ${clientName}</p>
                            <p style="margin:4px 0"><strong>Email:</strong> ${clientEmail}</p>
                            <p style="margin:4px 0"><strong>Phone:</strong> ${clientPhone}</p>
                            <hr style="border:none;border-top:1px solid #ddd;margin:12px 0"/>
                            
                            <p style="margin:4px 0"><strong>Package:</strong> ${validityPeriodString}</p>
                            
                            ${discountAmountValue > 0 ? `
                                <div style="margin-top:8px; display:flex; justify-content:space-between; font-size:13px; color:#ff3b30;">
                                    <span>Discount Applied (${couponCode || 'PROMO'}):</span>
                                    <strong>- ₹${discountAmountValue}</strong>
                                </div>
                            ` : ''}
                            
                            <hr style="border:none;border-top:2px solid #007bff;margin:12px 0"/>
                            <p style="margin:4px 0; font-size:18px; color:#28a745;"><strong>Total Amount:</strong> ₹${totalPaymentAmount}</p>
                        </div>
                        <div style="text-align: center; margin: 35px 0;">
                            <a href="${paymentLink}" style="padding: 14px 32px; background-color: #28a745; color: white; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px;">Complete Payment</a>
                        </div>
                        <p style="color:#666;font-size:12px;text-align:center;">You can pay via <strong>Razorpay (UPI, Card, NetBanking)</strong> or <strong>Cheque</strong>.</p>
                    </div>
                </div>`;

                await transporter.sendMail({
                    from: `"Iflora Info Pvt. Ltd." <${process.env.SMTP_USER}>`,
                    to: clientEmail,
                    subject: "Activate Your Service Account - Payment Pending",
                    html: html
                });
            }
        } catch (emailError) {
             console.error("❌ Failed to send email:", emailError.message);
        }
    }

    return res.status(201).json({
      success: true,
      message: type === 'service' ? "✅ Service Client created. Payment link generated." : "Client created successfully",
      client: {
        id: clientRecord._id,
        name: clientRecord.clientName,
        email: clientRecord.clientEmail,
        registrationStatus,
        isActive: clientRecord.isActive
      }
    });

  } catch (error) {
    console.error("🔥 Create Client Failed:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// ✅ GET ALL CLIENTS
export const getAllClients = async (req, res) => {
  try {
    const isEmployee = req.user && (req.user.role === 'EMPLOYEE' || req.user.role === 'employee');
    const rawCreatorId = req.user ? (req.user.id || req.user.userId || req.user._id) : null;

    let creatorIdObjectId = null;
    if (rawCreatorId) {
      try {
        creatorIdObjectId = typeof rawCreatorId === 'string' ? new mongoose.Types.ObjectId(rawCreatorId) : rawCreatorId;
      } catch (error) {
        creatorIdObjectId = rawCreatorId;
      }
    }

    const query = isEmployee && creatorIdObjectId ? { createdBy: creatorIdObjectId } : {};
    
    // 1. Fetch regular service clients
    const regularClients = await Details.find(query)
      .populate("serviceIds", "name price")
      .populate("createdBy", "name")
      .populate("packageId", "name price durationDays")
      .populate("packageIds", "name price durationDays")
      .sort({ createdAt: -1 });

    // 2. Fetch service-only software clients (if not restricted to employee)
    // For now, let's include them in the same query context
    const serviceOnlySoftwareClients = await SoftwareClient.find({ 
      softwareId: null,
      ...(isEmployee && creatorIdObjectId ? { createdByResellerEmployee: creatorIdObjectId } : {})
    })
    .populate("selectedServices.serviceId", "name price")
    .populate("createdByReseller", "name")
    .populate("createdByResellerEmployee", "name")
    .populate("createdByAdminEmployee", "name");

    // 3. Map service-only software clients to Details schema for uniform UI
    const mappedSoftwareClients = serviceOnlySoftwareClients.map(sc => ({
      _id: sc._id,
      clientName: sc.ownerName,
      clientEmail: sc.email,
      clientPhone: sc.phone,
      serviceIds: sc.selectedServices?.map(s => ({ _id: s.serviceId, name: s.name, price: s.price })) || [],
      clientType: "service",
      isActive: sc.isActive,
      paymentStatus: sc.paymentStatus,
      paymentAmount: sc.paymentAmount,
      validityPeriod: sc.packageName || sc.validityPeriod || "—",
      expiryDate: sc.packageEndDate,
      createdBy: sc.createdByReseller || sc.createdByAdminEmployee || sc.createdByResellerEmployee || null,
      createdByType: sc.createdByAdmin ? "Admin" : (sc.createdByReseller ? "Reseller" : "Staff"),
      creatorName: sc.createdByReseller?.name || sc.createdByAdminEmployee?.name || sc.createdByResellerEmployee?.name || (sc.createdByAdmin ? "Admin" : "Unknown"),
      createdAt: sc.createdAt,
      source: "software_client", 
      businessName: sc.businessName
    }));

    const allClients = [...regularClients, ...mappedSoftwareClients].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({
      success: true,
      clients: allClients,
      summary: {
        total: allClients.length,
        regular: regularClients.length,
        serviceOnlySoftware: mappedSoftwareClients.length
      }
    });

  } catch (error) {
    console.error("Get clients error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ UPDATE CLIENT
export const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { clientName, clientEmail, clientPhone } = req.body;

    const client = await Details.findById(id);
    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    if (req.user && (req.user.role === 'EMPLOYEE' || req.user.role === 'employee')) {
        const creatorId = req.user.id || req.user._id || req.user.userId;
        if (client.createdBy && client.createdBy.toString() !== creatorId) {
            return res.status(403).json({ success: false, message: "Forbidden" });
        }
    }

    if (clientName) client.clientName = clientName;
    if (clientEmail) client.clientEmail = clientEmail;
    if (clientPhone) client.clientPhone = clientPhone;

    await client.save();

    emitEvent("client_data_change", { action: "update", id: client._id });

    return res.status(200).json({ success: true, message: "Client updated successfully", client });
  } catch (error) {
    console.error("Update client error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ TOGGLE CLIENT STATUS
export const toggleClientStatus = async (req, res) => {
  try {
    const { id } = req.params;

    let client = await Details.findById(id);
    let modelType = "Details";

    if (!client) {
      client = await SoftwareClient.findById(id);
      modelType = "SoftwareClient";
    }

    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    if (req.user && (req.user.role === 'EMPLOYEE' || req.user.role === 'employee')) {
        return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const wasActive = client.isActive;
    client.isActive = !client.isActive;

    // If we are activating a client whose payment was pending or cheque_pending,
    // mark it as completed/manual since the admin is manually overriding it.
    if (!wasActive && client.isActive) {
      if (client.paymentStatus === 'pending' || client.paymentStatus === 'cheque_pending') {
        client.paymentStatus = 'completed';
        if (!client.paymentMethod) client.paymentMethod = 'manual';
        client.paymentDate = new Date();
      }
    }
    
    await client.save();

    if (modelType === "Details") {
      emitEvent("client_data_change", { action: "toggle_status", id: client._id });
    } else {
      emitEvent("software_client_change", { action: "toggle_status", id: client._id });
    }

    return res.status(200).json({
      success: true,
      message: `Client ${client.isActive ? 'activated' : 'deactivated'} successfully`,
      isActive: client.isActive
    });
  } catch (error) {
    console.error("Toggle status error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ DELETE CLIENT
export const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;

    let client = await Details.findById(id);
    let modelType = "Details";

    if (!client) {
      client = await SoftwareClient.findById(id);
      modelType = "SoftwareClient";
    }

    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    if (req.user && (req.user.role === 'EMPLOYEE' || req.user.role === 'employee')) {
        const creatorId = req.user.id || req.user._id || req.user.userId;
        const clientCreator = modelType === "Details" ? client.createdBy : client.createdByAdminEmployee;
        if (clientCreator && clientCreator.toString() !== creatorId) {
            return res.status(403).json({ success: false, message: "Forbidden" });
        }
    }

    if (modelType === "Details") {
      await Details.findByIdAndDelete(id);
      emitEvent("client_data_change", { action: "delete", id: client._id });
    } else {
      await SoftwareClient.findByIdAndDelete(id);
      emitEvent("software_client_change", { action: "delete", id: client._id });
    }

    return res.status(200).json({ success: true, message: "Client deleted successfully" });
  } catch (error) {
    console.error("Delete client error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


// ✅ CHECK CLIENT STATUS BY EMAIL
export const checkClientStatusByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const client = await Details.findOne({ clientEmail: email });
    
    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }
    
    return res.status(200).json({
      success: true,
      isActive: client.isActive,
      expiryDate: client.expiryDate,
      isExpired: new Date(client.expiryDate) < new Date()
    });
  } catch (error) {
    console.error("Check status error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// 🚨 MANUAL REMINDER API
import { sendReminderEmail } from "../utils/emailHelpers.js";

export const sendManualReminder = async (req, res) => {
    try {
        const { email, clientType, clientName, softwareName, expiryDate: bodyExpiry } = req.body;
        if (!email) return res.status(400).json({ success: false, message: "Email required" });

        let client = null;
        let renewalLink = "";
        let daysLeft = 0;
        let finalExpiry = bodyExpiry;

        // 1. Try to find local record for accurate IDs/Links
        if (clientType === 'software') {
            client = await SoftwareClient.findOne({ email }).populate('softwareId');
            renewalLink = `${process.env.FRONTEND_URL}/renew/${encodeURIComponent(email)}`;
            if (client && !finalExpiry) finalExpiry = client.packageEndDate;
        } else {
            client = await Details.findOne({ clientEmail: email });
            renewalLink = `${process.env.FRONTEND_URL}/pay-service/${client?._id || email}`;
            if (client && !finalExpiry) finalExpiry = client.expiryDate;
        }

        // 2. Fallback for external-only clients or missing dates
        if (!finalExpiry) {
             return res.status(400).json({ success: false, message: "Could not determine expiry date for this client." });
        }

        const dateObj = new Date(finalExpiry);
        if (isNaN(dateObj.getTime())) {
             return res.status(400).json({ success: false, message: "Invalid expiry date provided." });
        }

        daysLeft = Math.ceil((dateObj - new Date()) / (1000 * 60 * 60 * 24));

        // Create a synthetic client object if local record is missing
        const syntheticClient = {
            email: email,
            clientEmail: email,
            ownerName: clientName || (client ? (client.ownerName || client.clientName) : 'Valued Client'),
            softwareName: softwareName || (client ? (client.softwareName || client.softwareId?.name) : 'Your Subscription'),
            expiryDate: dateObj,
            packageEndDate: dateObj
        };

        await sendReminderEmail(syntheticClient, daysLeft, renewalLink);

        return res.status(200).json({ success: true, message: "Reminder email sent successfully!" });

    } catch (error) {
        console.error("Manual reminder error:", error);
        return res.status(500).json({ success: false, message: "Failed to send reminder" });
    }
};
