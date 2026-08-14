import mongoose from "mongoose";
import Razorpay from "razorpay";
import crypto from "crypto";
import axios from "axios";
import SoftwareClient from "../models/softwareClient.model.js";
import Software from "../models/software.model.js";
import Details from "../models/client.model.js";
import sendEmail from "../utils/emailService.js";
import { emitEvent } from "../socket/socketHandler.js";
import Transaction from "../models/transaction.model.js";
import CommissionService from "../services/commission.service.js";
import LedgerService from "../services/ledger.service.js";
import { callExternal } from "../utils/externalRequester.js";

const getRazorpay = () => new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const findClient = async (id) => {
  if (mongoose.Types.ObjectId.isValid(id)) {
    const swClient = await SoftwareClient.findById(id).populate("softwareId", "name clientToggleStatusApi");
    if (swClient) return { type: "software", client: swClient };
  }
  const swExtClient = await SoftwareClient.findOne({ externalClientId: id }).populate("softwareId", "name clientToggleStatusApi");
  if (swExtClient) return { type: "software", client: swExtClient };

  if (mongoose.Types.ObjectId.isValid(id)) {
    const regClient = await Details.findById(id).populate("serviceIds packageIds");
    if (regClient) return { type: "regular", client: regClient };
  }
  return null;
};

const getSoftwareClientDoc = async (id) => {
  if (mongoose.Types.ObjectId.isValid(id)) {
    const swClient = await SoftwareClient.findById(id);
    if (swClient) return swClient;
  }
  return await SoftwareClient.findOne({ externalClientId: id });
};

// ─── GET /api/software-clients/pay/:id (public) ───────────────────────────────
export const getPaymentPageData = async (req, res) => {
  try {
    const result = await findClient(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: "Invalid or expired payment link" });

    if (result.type === "software") {
      return res.status(200).json({ success: true, client: result.client });
    } else {
      const reg = result.client;
      const formatted = {
        _id: reg._id,
        ownerName: reg.clientName,
        businessName: reg.companyName || reg.clientName,
        email: reg.clientEmail,
        phone: reg.clientPhone,
        softwareName: reg.validityPeriod || "Service Subscription",
        packageName: reg.packageIds?.[0]?.name || "Standard Plan",
        packagePrice: reg.paymentAmount || 0,
        selectedServices: (reg.serviceIds || []).map(s => ({ serviceId: s._id, name: s.name, price: s.price })),
        isActive: reg.status === 'active',
        paymentStatus: reg.paymentStatus || 'pending'
      };
      return res.status(200).json({ success: true, client: formatted });
    }
  } catch (err) {
    console.error("[PaymentPageData error]:", err);
    return res.status(500).json({ success: false, message: "Could not load payment details" });
  }
};

// ─── POST /api/software-clients/:id/pay-online ────────────────────────────────
// Step 1: create Razorpay order
export const createOnlineOrder = async (req, res) => {
  try {
    const client = await getSoftwareClientDoc(req.params.id);
    if (!client) return res.status(404).json({ success: false, message: "Client not found" });

    // (Sendzyy native payment invite check removed to use Master Admin Razorpay credentials)

    let amount = client.packagePrice || 0;
    
    // Add selected services prices
    if (client.selectedServices && client.selectedServices.length > 0) {
      const servicesTotal = client.selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);
      amount += servicesTotal;
    }

    // Subtract pre-applied discount from admin side
    if (client.discountAmount > 0) {
      amount -= client.discountAmount;
      console.log(`[Payment] Pre-applied discount found: -₹${client.discountAmount}`);
    }

    // Apply Coupon if provided via payment page input (overrides/adds)
    const { couponCode } = req.body;
    let discount = 0;
    if (couponCode) {
      try {
        // Reuse validation logic or call a helper
        const Coupon = (await import("../models/coupon.model.js")).default;
        const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
        if (coupon) {
          // Validate logic (simplified check here, can be robust)
          const isExpired = coupon.expiryDate && new Date(coupon.expiryDate) < new Date();
          const limitReached = coupon.usageLimit && coupon.usedCount >= coupon.usageLimit;
          const minReached = amount >= coupon.minPurchaseAmount;
          
          let scopeOk = coupon.isMaster;
          if (!scopeOk) {
            const swOk = coupon.applicableSoftware.some(id => id.toString() === client.softwareId.toString());
            const svOk = client.selectedServices.some(s => coupon.applicableServices.some(asid => asid.toString() === s.serviceId.toString()));
            scopeOk = swOk || svOk;
          }

          if (!isExpired && !limitReached && minReached && scopeOk) {
            if (coupon.discountType === 'flat') {
              discount = coupon.discountValue;
            } else {
              discount = (amount * coupon.discountValue) / 100;
              if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) discount = coupon.maxDiscountAmount;
            }
            amount -= discount;
            console.log(`[Payment] Applied coupon ${couponCode}: -₹${discount}`);
            
            client.appliedCoupon = couponCode.toUpperCase();
            client.discountAmount = discount;
            await client.save();
          }
        }
      } catch (err) {
        console.error("Coupon application error in controller:", err);
      }
    }

    console.log("[Payment] createOnlineOrder — clientId:", req.params.id, "totalAmount:", amount);

    if (isNaN(Number(amount)) || Number(amount) < 0) {
      return res.status(400).json({ success: false, message: `Invalid amount: ${amount}.` });
    }

    if (Number(amount) === 0) {
      console.log("[Payment] Zero amount detected (Free Coupon). Returning isFree flag.");
      return res.status(200).json({ success: true, isFree: true });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ success: false, message: "Razorpay keys not configured on server" });
    }

    const instance = getRazorpay();
    const order = await instance.orders.create({
      amount: Math.round(Number(amount) * 100),
      currency: "INR",
      receipt: `sc_${Date.now()}`
    });

    return res.status(200).json({ success: true, order, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    const msg = err?.error?.description || err?.message || JSON.stringify(err);
    console.error("[Payment] createOnlineOrder error:", msg);
    return res.status(500).json({ success: false, message: msg || "Failed to create order" });
  }
};

// ─── POST /api/software-clients/:id/verify-online ────────────────────────────
// Step 2: verify signature → activate client
export const verifyOnlinePayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    console.log("[Payment] verifyOnlinePayment — clientId:", req.params.id);
    const client = await getSoftwareClientDoc(req.params.id);
    console.log("[Payment] Found client:", client?.email, "paymentStatus:", client?.paymentStatus);
    if (!client) return res.status(404).json({ success: false, message: "Client not found" });

    // (Sendzyy native payment verification check removed to use Master Admin Razorpay verification)

    // Verify signature (unless it's a free checkout)
    if (razorpay_payment_id === 'FREE') {
      const calculatedTotal = (client.packagePrice || 0) + (client.selectedServices || []).reduce((s, x) => s + (x.price || 0), 0) - (client.discountAmount || 0);
      if (calculatedTotal !== 0) {
        return res.status(400).json({ success: false, message: "Security check failed: Amount is not zero." });
      }
      console.log("[Payment] Free checkout verified for client:", client.email);
    } else {
      const text = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(text).digest("hex");

      if (expected !== razorpay_signature) {
        return res.status(400).json({ success: false, message: "Invalid payment signature" });
      }
    }

    // Activate on external software if toggle API configured
    const software = await Software.findById(client.softwareId);

    // If externalClientId is missing, try to find it from clientsGetApi by email
    if (software?.clientToggleStatusApi && !client.externalClientId && software.clientsGetApi) {
      try {
        const extRes = await callExternal(software.clientsGetApi, "GET");
        const list = Array.isArray(extRes.data) ? extRes.data
          : (extRes.data?.clients || extRes.data?.data || extRes.data?.admins || extRes.data?.tenants || []);
        const match = list.find(c => (c.email || "").toLowerCase() === client.email.toLowerCase());
        if (match) {
          client.externalClientId = String(match.id || match._id);
          console.log("[Payment] Found externalClientId by email:", client.externalClientId);
        }
      } catch (e) {
        console.warn("[Payment] Could not fetch externalClientId:", e.message);
      }
    }

    if (software?.clientToggleStatusApi && client.externalClientId) {
      const url = software.clientToggleStatusApi.replace(":id", client.externalClientId);
      const toggleRes = await callExternal(url, "PATCH", { status: "active" });
      console.log("[Payment] Toggle status response:", toggleRes.status, JSON.stringify(toggleRes.data));
      
      // Sync subscription details on online payment activation
      if (software.clientsGetApi) {
        try {
          const extRes = await callExternal(software.clientsGetApi, "GET");
          const list = Array.isArray(extRes.data) ? extRes.data
            : (extRes.data?.clients || extRes.data?.data || extRes.data?.admins || extRes.data?.tenants || []);
          const match = list.find(c => (c.email || "").toLowerCase() === client.email.toLowerCase());
          if (match) {
            if (match.subscription) {
              client.packageName = match.subscription.planName || client.packageName;
              client.packagePrice = match.subscription.price || client.packagePrice;
              if (match.subscription.expiryDate) {
                client.packageEndDate = new Date(match.subscription.expiryDate);
              }
            } else if (match.packageEndDate) {
              client.packageEndDate = new Date(match.packageEndDate);
            }
          }
        } catch (syncErr) {
          console.warn("[Payment] Post-activation sync failed:", syncErr.message);
        }
      }
    } else {
      console.warn("[Payment] Skipping toggle — missing API or externalClientId:", {
        hasToggleApi: !!software?.clientToggleStatusApi,
        externalClientId: client.externalClientId
      });
    }

    // Calculate total amount paid
    let totalPaid = client.packagePrice || 0;
    if (client.selectedServices && client.selectedServices.length > 0) {
      totalPaid += client.selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);
    }
    
    // Subtract discount if used
    totalPaid -= (client.discountAmount || 0);

    // Increment coupon usage if present
    if (client.appliedCoupon) {
      try {
        const Coupon = (await import("../models/coupon.model.js")).default;
        await Coupon.updateOne({ code: client.appliedCoupon }, { $inc: { usedCount: 1 } });
      } catch (err) {
        console.error("Error incrementing coupon count:", err);
      }
    }

    // Update local record
    client.isActive = true;
    client.paymentStatus = 'completed';
    client.paymentMethod = 'online';
    client.paymentAmount = totalPaid;
    client.paymentDate = new Date();
    client.transactionId = razorpay_payment_id;
    client.packageStartDate = new Date();
    await client.save();

    // ─── Commission & Ledger Integration ───
    try {
      const commission = await CommissionService.calculateCommission(
        client.createdByReseller,
        totalPaid,
        client.softwareId,
        client.selectedServices || []
      );

      const transaction = await Transaction.create({
        clientId: client._id,
        packageId: client.packageId,
        resellerId: client.createdByReseller,
        softwareId: client.softwareId,
        amount: totalPaid,
        resellerCommission: commission,
        adminRevenue: totalPaid - commission,
        paymentId: razorpay_payment_id || "FREE",
        status: "success",
        paymentDate: new Date()
      });

      if (client.createdByReseller) {
        await LedgerService.updateLedger(transaction);
      }
    } catch (err) {
      console.error("[Payment] Ledger/Commission error:", err.message);
      // Don't fail the entire request if ledger update fails, but log it
    }

    emitEvent("software_client_change", { action: "payment_complete", id: client._id });

    return res.status(200).json({ success: true, message: "Payment verified and client activated" });
  } catch (err) {
    console.error("[Payment] verifyOnlinePayment error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── POST /api/software-clients/:id/pay-cheque ───────────────────────────────
export const submitChequePayment = async (req, res) => {
  try {
    const client = await getSoftwareClientDoc(req.params.id);
    console.log("[Payment] submitChequePayment — id:", req.params.id, "found:", !!client, "email:", client?.email);
    if (!client) return res.status(404).json({ success: false, message: "Client not found" });

    const { chequeNumber, chequeBank, chequeDate } = req.body;
    const chequePhoto = req.file ? `/uploads/cheques/${req.file.filename}` : null;

    const totalPaid = (client.packagePrice || 0) + (client.selectedServices || []).reduce((s, x) => s + (x.price || 0), 0) - (client.discountAmount || 0);

    client.paymentMethod = 'cheque';
    client.paymentStatus = 'cheque_pending';
    client.paymentAmount = totalPaid;
    client.chequeNumber = chequeNumber;
    client.chequeBank = chequeBank;
    client.chequeDate = chequeDate;
    if (chequePhoto) client.chequePhoto = chequePhoto;
    // isActive stays false — admin activates manually after cheque clears

    await client.save();
    emitEvent("software_client_change", { action: "cheque_submitted", id: client._id });

    return res.status(200).json({ success: true, message: "Cheque details submitted. Awaiting clearance." });
  } catch (err) {
    console.error("[Payment] submitChequePayment error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Called after client creation — sends payment email ──────────────────────
export const sendPaymentEmail = async (client) => {
  const paymentUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pay-client/${client._id}`;

  // Build detail rows from signupFieldValues (Step 2 data) — these are the actual field values
  const extraEntries = (client.signupFieldValues instanceof Map
    ? [...client.signupFieldValues.entries()]
    : Object.entries(client.signupFieldValues || {}))
    .filter(([key]) => !key.toLowerCase().includes("password"));

  const detailRows = extraEntries.map(([key, val]) =>
    `<p style="margin:4px 0"><strong>${key}:</strong> ${val}</p>`
  ).join('');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e1e1e1;border-radius:8px;overflow:hidden;">
      <div style="background:#007bff;padding:20px;text-align:center;color:white;">
        <h2 style="margin:0;">Complete Your Payment</h2>
      </div>
      <div style="padding:30px;color:#333;">
        <p>Dear <strong>${client.ownerName}</strong>,</p>
        <p>Your account for <strong>${client.softwareName}</strong> has been created. Please complete your payment to activate your account.</p>
        <div style="background:#f8f9fa;padding:20px;border-radius:6px;margin:20px 0;border-left:4px solid #007bff;">
          <p style="margin:0 0 10px 0;font-weight:bold;color:#555;">Your Details</p>
          ${detailRows || `
            <p style="margin:4px 0"><strong>Name:</strong> ${client.ownerName}</p>
            <p style="margin:4px 0"><strong>Business:</strong> ${client.businessName}</p>
            <p style="margin:4px 0"><strong>Email:</strong> ${client.email}</p>
            <p style="margin:4px 0"><strong>Phone:</strong> ${client.phone}</p>
          `}
          <hr style="border:none;border-top:1px solid #ddd;margin:12px 0"/>
          <p style="margin:4px 0"><strong>Package:</strong> ${client.packageName || 'Selected Package'}</p>
          ${client.packagePrice != null ? `<p style="margin:4px 0"><strong>Package Price:</strong> ₹${client.packagePrice}</p>` : ''}
          
          ${client.selectedServices && client.selectedServices.length > 0 ? `
            <div style="margin-top:12px; border-top:1px dashed #ddd; padding-top:8px;">
              <p style="margin:0 0 5px 0; font-weight:bold; color:#555; font-size:12px;">Additional Services:</p>
              ${client.selectedServices.map(s => `
                <div style="display:flex; justify-content:space-between; font-size:13px; margin:2px 0;">
                  <span>${s.name}</span>
                  <strong>₹${s.price}</strong>
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${client.discountAmount > 0 ? `
            <div style="margin-top:8px; display:flex; justify-content:space-between; font-size:13px; color:#ff3b30;">
              <span>Coupon Discount (${client.appliedCoupon}):</span>
              <strong>- ₹${client.discountAmount}</strong>
            </div>
          ` : ''}
          
          <hr style="border:none;border-top:2px solid #007bff;margin:12px 0"/>
          <p style="margin:4px 0; font-size:18px; color:#28a745;"><strong>Total Amount:</strong> ₹${(client.packagePrice || 0) + (client.selectedServices || []).reduce((a, b) => a + (b.price || 0), 0) - (client.discountAmount || 0)}</p>
        </div>
        <div style="text-align:center;margin:30px 0;">
          <a href="${paymentUrl}" style="padding:14px 32px;background:#28a745;color:white;text-decoration:none;border-radius:50px;font-weight:bold;font-size:16px;">
            Complete Payment
          </a>
        </div>
        <p style="color:#666;font-size:13px;text-align:center;">If the button doesn't work, copy this link:<br/>${paymentUrl}</p>
      </div>
    </div>`;

  await sendEmail(client.email, `Complete Your Payment — ${client.softwareName}`, html);
};
