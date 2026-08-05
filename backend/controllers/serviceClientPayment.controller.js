import Razorpay from "razorpay";
import crypto from "crypto";
import Details from "../models/client.model.js";
import Package from "../models/package.model.js";
import Coupon from "../models/coupon.model.js";
import { validateCouponLogic } from "../utils/couponHelper.js";
import { emitEvent } from "../socket/socketHandler.js";

const getRazorpay = () => new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ✅ GET Payment Data (Public)
export const getServiceClientPaymentData = async (req, res) => {
  try {
    const client = await Details.findById(req.params.id)
      .populate("serviceIds", "name price")
      .populate("packageIds", "name price");
    
    if (!client) return res.status(404).json({ success: false, message: "Client not found" });
    return res.status(200).json({ success: true, client });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Create Razorpay Order
export const createServiceClientOrder = async (req, res) => {
  try {
    const { couponCode } = req.body;
    const client = await Details.findById(req.params.id);
    if (!client) return res.status(404).json({ success: false, message: "Client not found" });

    let amount = client.paymentAmount || 0;
    let discount = 0;
    let appliedCouponId = null;

    if (couponCode) {
      const couponResult = await validateCouponLogic(
        couponCode, 
        null, 
        client.serviceIds.map(id => id.toString()), 
        amount
      );
      
      if (couponResult.success) {
        discount = couponResult.discount;
        amount = couponResult.finalAmount;
        appliedCouponId = couponResult.coupon._id;
        
        // Update client record with applied coupon temporarily or permanently
        client.couponCode = couponCode;
        client.discountAmount = discount;
        client.appliedCoupon = appliedCouponId;
        await client.save();
      } else {
        return res.status(400).json({ success: false, message: couponResult.message });
      }
    }

    if (amount <= 0) {
      return res.status(200).json({ success: true, isFree: true });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ success: false, message: "Razorpay keys not configured" });
    }

    const instance = getRazorpay();
    const order = await instance.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `svc_${Date.now()}`
    });

    return res.status(200).json({ success: true, order, keyId: process.env.RAZORPAY_KEY_ID, discount });
  } catch (err) {
    console.error("Create service order error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to create order" });
  }
};

// ✅ Verify Razorpay Payment
export const verifyServiceClientPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const client = await Details.findById(req.params.id);
    if (!client) return res.status(404).json({ success: false, message: "Client not found" });

    // Verify signature
    const text = razorpay_order_id + "|" + razorpay_payment_id;
    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(text).digest("hex");

    if (expected !== razorpay_signature && razorpay_payment_id !== 'FREE') {
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    // Update record
    client.isActive = true;
    client.paymentStatus = 'completed';
    client.paymentMethod = 'online';
    client.transactionId = razorpay_payment_id;
    client.paymentDate = new Date();
    await client.save();

    // Increment coupon usage if applied
    if (client.appliedCoupon) {
      await Coupon.findByIdAndUpdate(client.appliedCoupon, { $inc: { usedCount: 1 } });
    }

    emitEvent("client_data_change", { action: "payment_complete", id: client._id });

    return res.status(200).json({ success: true, message: "Payment verified and account activated" });
  } catch (err) {
    console.error("Verify service payment error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Submit Cheque Payment
export const submitServiceClientCheque = async (req, res) => {
  try {
    const client = await Details.findById(req.params.id);
    if (!client) return res.status(404).json({ success: false, message: "Client not found" });

    const { chequeNumber, chequeBank, chequeDate, couponCode } = req.body;
    const chequePhoto = req.file ? `/uploads/cheques/${req.file.filename}` : null;

    if (couponCode) {
        const couponResult = await validateCouponLogic(
          couponCode, 
          null, 
          client.serviceIds.map(id => id.toString()), 
          client.paymentAmount
        );
        
        if (couponResult.success) {
          client.couponCode = couponCode;
          client.discountAmount = couponResult.discount;
          client.appliedCoupon = couponResult.coupon._id;
        }
    }

    client.paymentMethod = 'cheque';
    client.paymentStatus = 'cheque_pending';
    client.chequeNumber = chequeNumber;
    client.chequeBank = chequeBank;
    client.chequeDate = chequeDate;
    if (chequePhoto) client.chequePhoto = chequePhoto;
    
    await client.save();
    emitEvent("client_data_change", { action: "cheque_submitted", id: client._id });

    return res.status(200).json({ success: true, message: "Cheque details submitted. Awaiting clearance." });
  } catch (err) {
    console.error("Submit service cheque error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
