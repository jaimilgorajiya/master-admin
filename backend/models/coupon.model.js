import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  discountType: { type: String, enum: ['flat', 'percentage'], required: true },
  discountValue: { type: Number, required: true },
  minPurchaseAmount: { type: Number, default: 0 },
  maxDiscountAmount: { type: Number }, // Relevant for percentage discount

  // Scoping
  isMaster: { type: Boolean, default: false }, // Works for any software/service combination
  applicableSoftware: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Software' }],
  applicableServices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],

  expiryDate: { type: Date },
  usageLimit: { type: Number }, // Global usage limit
  usedCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },

  createdAt: { type: Date, default: Date.now }
});

const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon;
