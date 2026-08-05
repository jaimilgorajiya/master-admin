import Coupon from "../models/coupon.model.js";
import { validateCouponLogic } from "../utils/couponHelper.js";

// ─── ADMIN: Create Coupon ────────────────────────────────────────────────────
export const createCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.create(req.body);
    return res.status(201).json({ success: true, message: "Coupon created successfully", coupon });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: "Coupon code already exists" });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── ADMIN: Get All Coupons ──────────────────────────────────────────────────
export const getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find()
      .populate("applicableSoftware", "name")
      .populate("applicableServices", "name")
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, coupons });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── ADMIN: Toggle Status ────────────────────────────────────────────────────
export const toggleStatus = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found" });
    coupon.isActive = !coupon.isActive;
    await coupon.save();
    return res.status(200).json({ success: true, message: `Coupon is now ${coupon.isActive ? 'Active' : 'Inactive'}` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── ADMIN: Delete Coupon ────────────────────────────────────────────────────
export const deleteCoupon = async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true, message: "Coupon deleted successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── ADMIN: Update Coupon ────────────────────────────────────────────────────
export const updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found" });
    return res.status(200).json({ success: true, message: "Coupon updated successfully", coupon });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: "Coupon code already exists" });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUBLIC: Validate Coupon ─────────────────────────────────────────────────
export const validateCoupon = async (req, res) => {
  try {
    const { code, softwareId, serviceIds = [], amount } = req.body;
    const result = await validateCouponLogic(code, softwareId, serviceIds, amount);
    
    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      discount: result.discount,
      finalAmount: result.finalAmount,
      couponId: result.coupon._id
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
