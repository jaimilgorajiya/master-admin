import dotenv from "dotenv";
dotenv.config();

import connectDB from "./config/db.js";
import Software from "./models/software.model.js";

async function updateRegistry() {
  await connectDB();

  console.log("=== Updating Software Document for Sendzyy ===");

  // Find the Sendzyy software in MongoDB
  const sendzyy = await Software.findOne({ name: /sendzyy/i });
  if (!sendzyy) {
    console.error("❌ Sendzyy software document not found in MongoDB!");
    process.exit(1);
  }

  console.log(`Found software document in DB: ${sendzyy.name}`);
  console.log("Current clientSignupFields:", JSON.stringify(sendzyy.clientSignupFields, null, 2));

  // Filter out planId
  const updatedFields = (sendzyy.clientSignupFields || []).filter(f => f.fieldName !== "planId");

  sendzyy.clientSignupFields = updatedFields;
  await sendzyy.save();

  console.log("\n✅ Successfully updated clientSignupFields in MongoDB!");
  console.log("Updated clientSignupFields:", JSON.stringify(sendzyy.clientSignupFields, null, 2));

  process.exit(0);
}

updateRegistry();
