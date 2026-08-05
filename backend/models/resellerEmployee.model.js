import mongoose from "mongoose";

const resellerEmployeeSchema = new mongoose.Schema(
  {
    resellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reseller', required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    assignedServices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
    assignedSoftware: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Software' }],
    createdByReseller: { type: mongoose.Schema.Types.ObjectId, ref: 'Reseller' },
    createdByEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'ResellerEmployee' },
  },
  { timestamps: true }
);

const ResellerEmployee = mongoose.model("ResellerEmployee", resellerEmployeeSchema);
export default ResellerEmployee;
