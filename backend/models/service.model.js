import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    price: {
      type: Number,
      required: true,
      default: 0
    },
    duration: {
      type: Number,
      default: 1
    },
    durationUnit: {
      type: String,
      enum: ['months', 'one-time', 'lifetime'],
      default: 'months'
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Service = mongoose.model("Service", serviceSchema);

export default Service;
