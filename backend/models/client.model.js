import mongoose from "mongoose";

const detailsSchema = new mongoose.Schema(
  {
    clientName: {
      type: String,
      required: true,
    },
    clientEmail: {
      type: String,
      required: true,
      unique: true,
    },
    clientPhone: {
      type: String,
      required: true,
    },
    serviceIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
    }],
    clientType: {
      type: String,
      enum: ["service"],
      default: "service",
    },
    generatedPassword: {
      type: String,
      required: true,
    },
    registrationStatus: {
      type: String,
      enum: ["success", "failed", "pending", "skipped", "already_exists"],
      default: "pending",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
    },
    packageIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
    }],
    validityPeriod: {
      type: String, // Persist package name or duration string
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    reminderSent7Days: {
      type: Boolean,
      default: false
    },
    reminderSent2Days: {
      type: Boolean,
      default: false
    },
    reminderSent0Days: {
      type: Boolean,
      default: false
    },
    expiryMailSent: {
      type: Boolean,
      default: false
    },
    paymentAmount: {
        type: Number,
        default: 0
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'createdByType',
    },
    createdByType: {
      type: String,
      enum: ['User', 'Staff'],
      default: 'User',
    },
    couponCode: {
      type: String,
      default: null
    },
    discountAmount: {
      type: Number,
      default: 0
    },
    appliedCoupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      default: null
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "cheque_pending", "failed"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["online", "cheque", "manual"],
      default: null
    },
    transactionId: {
      type: String,
      default: null
    },
    chequeNumber: String,
    chequeBank: String,
    chequeDate: Date,
    chequePhoto: String,
    paymentDate: Date,
  },
  { timestamps: true }
);

const Details = mongoose.model("Details", detailsSchema);

export default Details; 