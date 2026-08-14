import dotenv from "dotenv";
dotenv.config();

import connectDB from "./config/db.js";
import Software from "./models/software.model.js";
import Reseller from "./models/reseller.model.js";
import SoftwareClient from "./models/softwareClient.model.js";
import { resellerCreateClient } from "./controllers/resellerAction.controller.js";

async function testResellerCreation() {
  await connectDB();

  console.log("=== Testing Reseller Client Creation Flow ===");

  const sendzyySoftware = await Software.findOne({ name: "Sendzyy" });
  if (!sendzyySoftware) {
    console.error("❌ Sendzyy software not found in DB!");
    process.exit(1);
  }

  // Find a reseller
  const reseller = await Reseller.findOne({});
  if (!reseller) {
    console.error("❌ No Reseller found in DB!");
    process.exit(1);
  }
  console.log(`Using Reseller: ${reseller.name} (${reseller._id})`);

  // Delete any existing test client with the email we'll use
  const testEmail = `reseller_test_${Date.now()}@test.com`;
  console.log(`Test client email: ${testEmail}`);

  // Create mock request and response
  const req = {
    user: {
      role: "RESELLER",
      id: reseller._id.toString()
    },
    body: {
      businessName: "Reseller Test Business",
      ownerName: "Reseller Owner",
      email: testEmail,
      phone: "9876543210",
      softwareId: sendzyySoftware._id.toString(),
      packageId: "panel_3m",
      packageName: "3 Month Access",
      packagePrice: 3999,
      signupFieldValues: {
        password: "TestPassword123!"
      }
    }
  };

  const res = {
    statusCode: 200,
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      console.log(`\nResponse Status Code: ${this.statusCode}`);
      console.log(`Response Data:`, JSON.stringify(data, null, 2));
      return this;
    }
  };

  try {
    await resellerCreateClient(req, res);

    // Verify in DB
    const client = await SoftwareClient.findOne({ email: testEmail });
    if (client) {
      console.log(`\n✅ Client created successfully in master-admin MongoDB!`);
      console.log(`Local isActive status: ${client.isActive}`);
      console.log(`External Client ID: ${client.externalClientId}`);

      // Verify on Sendzyy
      if (client.externalClientId) {
        console.log(`\nVerifying tenant status on Sendzyy backend...`);
        const axios = (await import("axios")).default;
        const loginRes = await axios.post("https://appapi.sendzyy.com/api/superadmin/login", {
          email: "superadmin@sendzyy.com",
          password: "Sendzyy@Admin2026"
        });
        const token = loginRes.data.token;
        const tenantRes = await axios.get(`https://appapi.sendzyy.com/api/superadmin/tenants`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const tenant = tenantRes.data.tenants.find(t => t.id === client.externalClientId || t._id === client.externalClientId);
        if (tenant) {
          console.log(`✅ Tenant found on Sendzyy!`);
          console.log(`Sendzyy status: ${tenant.status} (Expected: inactive)`);
        } else {
          console.log(`❌ Tenant not found on Sendzyy!`);
        }
      }
    } else {
      console.log(`❌ Client was not found in MongoDB after call!`);
    }
  } catch (err) {
    console.error("Error during reseller client creation test:", err);
  }

  process.exit(0);
}

testResellerCreation();
