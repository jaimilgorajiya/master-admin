import mongoose from "mongoose";

const resellerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, required: true },
    companyName: { type: String, required: true },
    address: { type: String },
    password: { type: String, required: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    allowedServices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
    allowedSoftware: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Software' }],
    marginConfig: {
      mode: { 
        type: String, 
        enum: ["overall", "product_specific", "slab_wise"], 
        default: "overall" 
      },
      overall: {
        type: { type: String, enum: ["percentage", "flat"], default: "percentage" },
        value: { type: Number, default: 0 }
      },
      productSpecific: [{
        softwareId: { type: mongoose.Schema.Types.ObjectId, ref: 'Software' },
        mode: { type: String, enum: ["fixed", "slab_wise"], default: "fixed" },
        type: { type: String, enum: ["percentage", "flat"] },
        value: { type: Number },
        slabs: [{
          minRevenue: { type: Number },
          maxRevenue: { type: Number },
          type: { type: String, enum: ["percentage", "flat"], default: "percentage" },
          margin: { type: Number }
        }]
      }],
      serviceSpecific: [{
        serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
        mode: { type: String, enum: ["fixed", "slab_wise"], default: "fixed" },
        type: { type: String, enum: ["percentage", "flat"] },
        value: { type: Number },
        slabs: [{
          minRevenue: { type: Number },
          maxRevenue: { type: Number },
          type: { type: String, enum: ["percentage", "flat"], default: "percentage" },
          margin: { type: Number }
        }]
      }],
      slabs: [{
        minRevenue: { type: Number },
        maxRevenue: { type: Number },
        type: { type: String, enum: ["percentage", "flat"], default: "percentage" },
        margin: { type: Number }
      }]
    }
  },
  { timestamps: true }
);

const Reseller = mongoose.model("Reseller", resellerSchema);
export default Reseller;
