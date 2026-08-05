import Coupon from "../models/coupon.model.js";

/**
 * Validates a coupon code against software, services, and amount.
 * @param {string} code - The coupon code string.
 * @param {string} softwareId - Optional software ID.
 * @param {Array<string>} serviceIds - Optional array of service IDs.
 * @param {number} amount - The current total amount.
 * @returns {Promise<Object>} - Validation result { success, message, discount, coupon }
 */
export const validateCouponLogic = async (code, softwareId, serviceIds = [], amount) => {
  try {
    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
    if (!coupon) return { success: false, message: "Invalid or expired coupon code" };

    // 1. Check Expiry
    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
      return { success: false, message: "Coupon has expired" };
    }

    // 2. Check Usage Limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return { success: false, message: "Coupon usage limit reached" };
    }

    // 3. Check Min Purchase
    if (amount < coupon.minPurchaseAmount) {
      return { success: false, message: `Minimum purchase of ₹${coupon.minPurchaseAmount} required` };
    }

    // 4. Check Scoping
    if (!coupon.isMaster) {
      const isSoftwareAllowed = softwareId && coupon.applicableSoftware.some(id => id.toString() === softwareId);
      const isAnyServiceAllowed = serviceIds.length > 0 && serviceIds.some(sid => coupon.applicableServices.some(asid => asid.toString() === sid));
      
      if (!isSoftwareAllowed && !isAnyServiceAllowed) {
        return { success: false, message: "This coupon is not applicable for the selected products" };
      }
    }

    // 5. Calculate Discount
    let discount = 0;
    if (coupon.discountType === 'flat') {
      discount = coupon.discountValue;
    } else {
      discount = (amount * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
        discount = coupon.maxDiscountAmount;
      }
    }

    // Ensure discount doesn't exceed amount
    discount = Math.min(discount, amount);

    return { 
      success: true, 
      message: "Coupon applied successfully",
      discount,
      finalAmount: amount - discount,
      coupon
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
};
