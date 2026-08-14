import dotenv from "dotenv";
dotenv.config();

import connectDB from "./config/db.js";
import SoftwareClient from "./models/softwareClient.model.js";

async function checkDbClients() {
  await connectDB();

  console.log("=== Querying Local MongoDB Software Clients ===");
  try {
    const clients = await SoftwareClient.find({}).populate("softwareId", "name");
    console.log(`Found ${clients.length} clients in local database:`);
    
    clients.forEach(c => {
      console.log(`- Business: ${c.businessName} (${c.email})`);
      console.log(`  Software: ${c.softwareId?.name || c.softwareName}`);
      console.log(`  Local status: isActive=${c.isActive} | paymentStatus=${c.paymentStatus}`);
      console.log(`  ExternalClientId: ${c.externalClientId}`);
      console.log(`  Created By: Admin=${c.createdByAdmin} | AdminEmployee=${c.createdByAdminEmployee} | Reseller=${c.createdByReseller}`);
      console.log(`  Dates: Start=${c.packageStartDate} | End=${c.packageEndDate}`);
      console.log(`  Created At: ${c.createdAt}`);
      console.log(`-----------------------------------------------`);
    });
  } catch (err) {
    console.error("Failed to query DB:", err.message);
  }
  process.exit(0);
}

checkDbClients();
