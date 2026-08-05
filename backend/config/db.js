import mongoose from "mongoose";
import { seedSoftwareRegistry } from "./seedHelper.js";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB connected successfully");
        await seedSoftwareRegistry();
    } catch (error) {
        console.error("MongoDB connection error:", error);
    }
};

export default connectDB;