import mongoose from "mongoose";

const staffSchema = new mongoose.Schema(
  {
    profilePicture: {
      type: String, // URL or base64 string
      default: "",
    },
    iiplId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    mobile: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      enum: ["Male", "Female"],
      default: "Male",
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    positionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Position",
      required: true,
    },
    allowedSoftware: [{ type: mongoose.Schema.Types.ObjectId, ref: "Software" }],
    allowedServices: [{ type: mongoose.Schema.Types.ObjectId, ref: "Service" }],
    password: {
      type: String, // Hashed
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const Staff = mongoose.model("Staff", staffSchema);

export default Staff;
