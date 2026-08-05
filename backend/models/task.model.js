import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    attachments: [{
        url: String, // Path to file
        filename: String,
        fileType: String // mimetype
    }],
    dueDate: {
      type: Date,
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Submitted", "Completed", "Rejected"],
      default: "Pending",
    },
    submission: {
      summary: String,
      links: [String],
      attachments: [{
          url: String, // Path to file
          filename: String,
          fileType: String // mimetype
      }],
      submittedAt: Date,
      isLate: Boolean
    },
    remarks: {
      type: String,
      trim: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User" // Admin
    },
  },
  { timestamps: true }
);

const Task = mongoose.model("Task", taskSchema);

export default Task;
