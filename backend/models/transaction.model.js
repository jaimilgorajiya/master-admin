import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    packageId: {
      type: String, // Can be local ObjectId or External Package ID string
    },
    resellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reseller',
      default: null,
    },
    softwareId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Software',
    },
    amount: {
      type: Number,
      required: true,
    },
    resellerCommission: {
      type: Number,
      default: 0,
    },
    adminRevenue: {
      type: Number,
      default: 0,
    },
    paymentId: {
      type: String, // Razorpay Payment ID or "Manual"
      required: true,
    },
    orderId: {
      type: String, // Razorpay Order ID
    },
    status: {
      type: String,
      enum: ["success", "failed", "pending"],
      default: "success",
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;
