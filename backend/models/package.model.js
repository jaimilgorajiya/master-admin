import mongoose from "mongoose";

const packageSchema = new mongoose.Schema(
  {
    name: {
      type: String, // e.g., "Gold Plan", "Starter Pack"
      required: true,
    },
    packageType: {
      type: String,
      enum: ["service", "software"],
      default: "service",
      required: true
    },
    serviceIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service"
    }],
    softwareId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Software"
    },
    durationDays: {
      type: Number, // Value of duration (e.g., 30, 180). Logic depends on 'unit'
      required: true,
    },
    unit: {
      type: String,
      enum: ["minutes", "days", "months", "years", "one-time"],
      default: "days",
      required: true
    },
    price: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Package = mongoose.model("Package", packageSchema);

export default Package;
