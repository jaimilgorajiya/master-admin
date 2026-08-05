import mongoose from "mongoose";

const positionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate positions within the same department
positionSchema.index({ name: 1, departmentId: 1 }, { unique: true });

const Position = mongoose.model("Position", positionSchema);

export default Position;
