import dotenv from "dotenv";
dotenv.config();

import connectDB from "./config/db.js";
import User from "./models/user.model.js";
import bcrypt from "bcryptjs";

async function resetPassword() {
  await connectDB();

  try {
    const admin = await User.findOne({ email: "iflorainfopvtltd@gmail.com" });
    if (!admin) {
      console.error("Admin user not found!");
      process.exit(1);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("Admin@123", salt);

    admin.password = hashedPassword;
    await admin.save();

    console.log("✅ Admin password reset successfully to: Admin@123");
  } catch (err) {
    console.error("Error resetting password:", err.message);
  }
  process.exit(0);
}

resetPassword();
