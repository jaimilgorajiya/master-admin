import mongoose from "mongoose";

const softwareClientSchema = new mongoose.Schema({
  // Business Details
  businessName: { type: String, required: true },
  ownerName:    { type: String, required: true },
  email:        { type: String, required: true },
  phone:        { type: String, required: true },

  // Which software this client was registered for (Optional if Service-only)
  softwareId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Software' },
  softwareName: { type: String },

  // The _id returned by the external software after successful signup
  externalClientId: { type: String },

  // Package & subscription
  packageId:        { type: String },
  packageName:      { type: String },
  packagePrice:     { type: Number },
  packageStartDate: { type: Date },
  packageEndDate:   { type: Date },

  // Payment
  paymentStatus:  { type: String, enum: ['pending','completed','failed','cheque_pending'], default: 'pending' },
  paymentMethod:  { type: String },
  paymentAmount:  { type: Number },
  paymentDate:    { type: Date },
  transactionId:  { type: String },
  paymentNotes:   { type: String },

  // Cheque details
  chequeNumber:   { type: String },
  chequeBank:     { type: String },
  chequeDate:     { type: String },
  chequePhoto:    { type: String }, // file path

  // Optional services selected during signup
  selectedServices: [{
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
    name:      { type: String },
    price:     { type: Number }
  }],

  // Coupon tracking
  appliedCoupon:   { type: String },
  discountAmount:  { type: Number, default: 0 },

  // Extra software-specific fields filled during signup (stored for email/reference)
  signupFieldValues: { type: Map, of: String, default: {} },

  // Status — false until payment is marked complete
  isActive: { type: Boolean, default: false },

  // Notification tracking
  reminderSent7Days: { type: Boolean, default: false },
  reminderSent2Days: { type: Boolean, default: false },
  reminderSent0Days: { type: Boolean, default: false },

  // Ownership hierarchy
  createdByReseller:         { type: mongoose.Schema.Types.ObjectId, ref: 'Reseller' },
  createdByResellerEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'ResellerEmployee' },
  createdByAdmin:            { type: Boolean, default: false }, // If created by Master Admin
  createdByAdminEmployee:    { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' }, // If created by an Admin Employee

  createdAt: { type: Date, default: Date.now }
});

const SoftwareClient = mongoose.model("SoftwareClient", softwareClientSchema);
export default SoftwareClient;
