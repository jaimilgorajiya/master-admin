import axios from "axios";

const email = "superadmin@sendzyy.com";
const password = "Sendzyy@Admin2026";
const apiBaseUrl = "https://appapi.sendzyy.com";

async function registerTenant() {
  console.log("=== Registering a New Tenant in Sendzyy ===");
  
  try {
    // 1. Get Token
    console.log("Authenticating Super Admin...");
    const loginRes = await axios.post(`${apiBaseUrl}/api/superadmin/login`, {
      email,
      password
    }, {
      headers: { "Content-Type": "application/json" }
    });

    const token = loginRes.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    console.log("Authentication successful!\n");

    // 2. Register Tenant Payload
    const newTenantData = {
      name: "Global Wellness Center 5",
      email: "wellness5@global.com",
      password: "GlobalWellness2026!",
      planId: "panel_6m",
      sendWelcomeEmail: true
    };

    console.log("Submitting Tenant Registration Payload:");
    console.log(JSON.stringify(newTenantData, null, 2));

    const regRes = await axios.post(
      `${apiBaseUrl}/api/superadmin/tenants/register-manual`,
      newTenantData,
      { headers }
    );

    console.log("\nSTATUS: Tenant Registration API responded with status:", regRes.status);
    console.log("✅ Tenant Registered successfully!");
    console.log("Response:", JSON.stringify(regRes.data, null, 2));

  } catch (err) {
    console.error("\n❌ Tenant Registration FAILED!");
    if (err.response) {
      console.error(`Status code: ${err.response.status}`);
      console.error("Response data:", JSON.stringify(err.response.data));
    } else {
      console.error("Error message:", err.message);
    }
  }
}

registerTenant();
 