import dotenv from "dotenv";
dotenv.config();

import connectDB from "./config/db.js";
import SoftwareClient from "./models/softwareClient.model.js";
import Software from "./models/software.model.js";
import { verifyOnlinePayment } from "./controllers/softwareClientPayment.controller.js";

async function testPaymentActivation() {
  await connectDB();

  console.log("=== Testing Online Payment Tenant Activation ===");

  // Find the tenant we created earlier (or another Sendzyy inactive tenant)
  const client = await SoftwareClient.findOne({ email: /reseller_test/i });
  if (!client) {
    console.error("❌ No reseller test client found in MongoDB!");
    process.exit(1);
  }

  console.log(`Found client: ${client.businessName} (${client.email})`);
  console.log(`Initial Local isActive status: ${client.isActive}`);
  console.log(`External Client ID: ${client.externalClientId}`);

  // Temporarily set discount to equal price + services so total is 0 (allowing FREE checkout signature bypass)
  const originalDiscount = client.discountAmount;
  const totalPrice = (client.packagePrice || 0) + (client.selectedServices || []).reduce((sum, s) => sum + (s.price || 0), 0);
  client.discountAmount = totalPrice;
  await client.save();
  console.log(`Temporarily set discountAmount to ₹${totalPrice} to bypass signature verification`);

  const req = {
    params: { id: client._id.toString() },
    body: {
      razorpay_payment_id: "FREE",
      razorpay_order_id: "order_mock123",
      razorpay_signature: "mock_signature"
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
    await verifyOnlinePayment(req, res);

    // Reload client
    const updatedClient = await SoftwareClient.findById(client._id);
    console.log(`\nLocal isActive status after payment verification: ${updatedClient.isActive}`);
    console.log(`Payment Status: ${updatedClient.paymentStatus}`);

    // Restore original discount in DB
    updatedClient.discountAmount = originalDiscount;
    await updatedClient.save();
    console.log("Restored original discountAmount in MongoDB.");

    // Query Sendzyy directly to confirm status is "active"
    if (updatedClient.externalClientId) {
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
      const tenant = tenantRes.data.tenants.find(t => t.id === updatedClient.externalClientId || t._id === updatedClient.externalClientId);
      if (tenant) {
        console.log(`✅ Tenant found on Sendzyy!`);
        console.log(`Sendzyy status: ${tenant.status} (Expected: active)`);
      } else {
        console.log(`❌ Tenant not found on Sendzyy!`);
      }
    }

  } catch (err) {
    console.error("Error during payment activation test:", err);
  }

  process.exit(0);
}

testPaymentActivation();
