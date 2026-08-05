import mongoose from "mongoose";

const resellerLedgerSchema = new mongoose.Schema(
  {
    resellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reseller',
      required: true,
    },
    month: {
      type: Number,
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    totalRevenue: {
      type: Number,
      default: 0,
    },
    totalCommission: {
      type: Number,
      default: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    pendingAmount: {
      type: Number,
      default: 0,
    },
    transactions: [
      {
        transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
        amount: Number,
        commission: Number,
        date: { type: Date, default: Date.now }
      }
    ],
    payouts: [
      {
        amount: { type: Number, required: true },
        date: { type: Date, default: Date.now },
        note: String
      }
    ],
    status: {
      type: String,
      enum: ["pending", "partial_paid", "paid"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Compound index to ensure uniqueness per reseller per month/year
resellerLedgerSchema.index({ resellerId: 1, month: 1, year: 1 }, { unique: true });

const ResellerLedger = mongoose.model("ResellerLedger", resellerLedgerSchema);

export default ResellerLedger;
