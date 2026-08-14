import axios from "axios";

const email = "superadmin@sendzyy.com";
const password = "Sendzyy@Admin2026";
const apiBaseUrl = "https://appapi.sendzyy.com";

async function testPaymentInvite() {
  console.log("=== Testing Sendzyy Payment Invite ===");
  try {
    const loginRes = await axios.post(`${apiBaseUrl}/api/superadmin/login`, {
      email,
      password
    });
    const token = loginRes.data.token;
    const headers = { Authorization: `Bearer ${token}` };

    const testEmail = `invite_test_${Date.now()}@test.com`;
    console.log(`Creating payment invite for email: ${testEmail}`);

    const inviteRes = await axios.post(
      `${apiBaseUrl}/api/superadmin/tenants/create-payment-invite`,
      {
        name: "Invite Test Tenant",
        email: testEmail,
        planId: "panel_3m"
      },
      { headers }
    );

    console.log("Invite Response:", JSON.stringify(inviteRes.data, null, 2));

    // Wait 1 second and fetch tenants
    await new Promise(resolve => setTimeout(resolve, 1000));

    const tenantsRes = await axios.get(`${apiBaseUrl}/api/superadmin/tenants`, { headers });
    const match = tenantsRes.data.tenants.find(t => t.email === testEmail);

    if (match) {
      console.log(`\nFound tenant in Sendzyy!`);
      console.log(`Tenant details:`, JSON.stringify(match, null, 2));
    } else {
      console.log(`\nNo tenant record found for ${testEmail} in Sendzyy yet.`);
    }

  } catch (err) {
    if (err.response) {
      console.error("Failed:", err.response.status, err.response.data);
    } else {
      console.error("Failed:", err.message);
    }
  }
}

testPaymentInvite();
