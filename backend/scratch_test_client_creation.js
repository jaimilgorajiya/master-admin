import dotenv from "dotenv";
dotenv.config();

import connectDB from "./config/db.js";
import Software from "./models/software.model.js";
import SoftwareClient from "./models/softwareClient.model.js";
import axios from "axios";
import jwt from "jsonwebtoken";

const email = "superadmin@sendzyy.com";
const password = "Sendzyy@Admin2026";
const apiBaseUrl = "https://appapi.sendzyy.com";

async function testRegistrationFlow() {
  await connectDB();

  console.log("=== Testing Master Admin Client Registration Flow ===");

  const sendzyySoftware = await Software.findOne({ name: "Sendzyy" });
  if (!sendzyySoftware) {
    console.error("❌ Sendzyy software not found in DB!");
    process.exit(1);
  }
  console.log(`Found Software in DB: ${sendzyySoftware.name} (${sendzyySoftware._id})`);

  const User = (await import("./models/user.model.js")).default;
  let admin = await User.findOne({});
  if (!admin) {
    try {
      admin = await User.create({
        name: "Seeded Admin",
        email: "masteradmin@test.com",
        password: "$2a$10$abcdefghijklmnopqrstuvwx",
        isActive: true
      });
      console.log(`Created temporary MASTER_ADMIN user: ${admin.email}`);
    } catch (dbErr) {
      // If duplicate key error, fetch it
      admin = await User.findOne({ email: "masteradmin@test.com" });
    }
  }

  const token = jwt.sign(
    { id: admin._id.toString(), userId: admin._id.toString(), email: admin.email, role: "MASTER_ADMIN" },
    process.env.JWT_SECRET || "supersecurejwtsecretkey",
    { expiresIn: "1h" }
  );

  console.log("Using MASTER_ADMIN User:", admin.email);

  const payload = {
    businessName: "Omega Inc",
    ownerName: "Olivia Omega",
    email: "olivia@omega.com",
    phone: "9900998811",
    softwareId: sendzyySoftware._id.toString(),
    packageId: "panel_3m",
    packageName: "3 Month Access",
    packagePrice: 3999,
    signupFieldValues: {
      password: "OmegaPassword2026!"
    }
  };

  // Clean up any existing software client with this email first to prevent duplicate errors
  await SoftwareClient.deleteOne({ email: "olivia@omega.com" });

  try {
    const res = await axios.post(
      "http://localhost:3000/api/software-clients/create",
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("\n✅ Master Admin Client Creation SUCCESS!");
    console.log("Response Status:", res.status);
    console.log("Response Data:", JSON.stringify(res.data, null, 2));

    const clientInDb = await SoftwareClient.findOne({ email: "sarah@deltalogistics.com" });
    if (clientInDb) {
      console.log("\n✅ Verified: Client successfully stored in Master Admin MongoDB!");
      console.log(`External Client ID: ${clientInDb.externalClientId}`);
    }

  } catch (err) {
    console.error("\n❌ Master Admin Client Creation FAILED!");
    if (err.response) {
      console.error(`Status code: ${err.response.status}`);
      console.error("Response data:", JSON.stringify(err.response.data));
    } else {
      console.error("Error message:", err.message);
    }
  }

  process.exit(0);
}

testRegistrationFlow();
