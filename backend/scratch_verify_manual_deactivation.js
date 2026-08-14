import axios from "axios";

const email = "superadmin@sendzyy.com";
const password = "Sendzyy@Admin2026";
const apiBaseUrl = "https://appapi.sendzyy.com";

async function verifyManualDeactivation() {
  console.log("=== Testing Proxy Manual Tenant Deactivation ===");

  try {
    // 1. Authenticate with local backend as Admin
    const loginRes = await axios.post("http://localhost:3000/api/auth/login", {
      email: "iflorainfopvtltd@gmail.com",
      password: "Admin@123"
    });
    const token = loginRes.data.token;
    console.log("Authenticated as Admin on local backend!");

    // 2. Get Sendzyy Token to query later
    const sendzyyLogin = await axios.post(`${apiBaseUrl}/api/superadmin/login`, {
      email,
      password
    });
    const sendzyyToken = sendzyyLogin.data.token;
    const sendzyyHeaders = { Authorization: `Bearer ${sendzyyToken}` };

    const testEmail = `manual_deact_test_${Date.now()}@test.com`;
    console.log(`Registering manual tenant without payment reference: ${testEmail}`);

    // Call registration through backend proxy
    const regRes = await axios.post(
      "http://localhost:3000/api/proxy/external",
      {
        targetUrl: "https://appapi.sendzyy.com/api/superadmin/tenants/register-manual",
        method: "POST",
        headers: { Authorization: `Bearer ${sendzyyToken}` },
        data: {
          name: "Verification Tenant",
          email: testEmail,
          password: "VerifyPassword2026!",
          planId: "panel_3m",
          paymentReference: "", // Leave blank to test deactivation
          sendWelcomeEmail: true
        }
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log("Registration Response:", JSON.stringify(regRes.data, null, 2));

    const tenantId = regRes.data?.tenant?.id || regRes.data?.tenant?._id || regRes.data?._id;

    if (tenantId) {
      console.log(`Successfully registered tenant. ID: ${tenantId}`);

      // Perform deactivation like the frontend would:
      console.log(`Simulating frontend deactivation for ID: ${tenantId}`);
      const toggleRes = await axios.post(
        "http://localhost:3000/api/proxy/external",
        {
          targetUrl: `https://appapi.sendzyy.com/api/superadmin/tenants/${tenantId}/status`,
          method: "PATCH",
          headers: { Authorization: `Bearer ${sendzyyToken}` },
          data: { status: "inactive" }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("Deactivation Response Status:", toggleRes.status);
      console.log("Deactivation Response Data:", JSON.stringify(toggleRes.data, null, 2));

      // Fetch tenant from Sendzyy directly to verify status
      const tenantsRes = await axios.get(`${apiBaseUrl}/api/superadmin/tenants`, { headers: sendzyyHeaders });
      const match = tenantsRes.data.tenants.find(t => t.id === tenantId || t._id === tenantId);
      if (match) {
        console.log(`\n✅ Verification SUCCESS! Tenant status on Sendzyy: ${match.status} (Expected: inactive)`);
      } else {
        console.log(`\n❌ Tenant not found on Sendzyy!`);
      }
    } else {
      console.log("❌ Failed to parse tenant ID from registration response.");
    }

  } catch (err) {
    if (err.response) {
      console.error("Failed:", err.response.status, err.response.data);
    } else {
      console.error("Failed:", err.message);
    }
  }

  process.exit(0);
}

verifyManualDeactivation();
