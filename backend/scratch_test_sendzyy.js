import axios from "axios";

// Sendzyy Dev Handoff credentials
const email = "superadmin@sendzyy.com";
const password = "Sendzyy@Admin2026";
const apiBaseUrl = "https://appapi.sendzyy.com"; // Adjust this if Sendzyy backend is hosted elsewhere

async function testSendzyy() {
  console.log("=== Sendzyy Super Admin Connection Test ===");
  console.log(`Target Host: ${apiBaseUrl}`);
  console.log(`Credentials: ${email} / ${password}\n`);

  try {
    console.log("Testing base plans endpoint (should be public)...");
    const plansRes = await axios.get(`${apiBaseUrl}/panel-plans`, { timeout: 10000 });
    console.log(`✅ Base plans endpoint connected! Status: ${plansRes.status}`);
    console.log(`Plans list length: ${plansRes.data?.length || 0}\n`);
  } catch (err) {
    console.error(`❌ Public plans check failed: ${err.message}\n`);
  }

  try {
    console.log("Testing Super Admin Login POST request...");
    const loginRes = await axios.post(`${apiBaseUrl}/api/superadmin/login`, {
      email,
      password
    }, {
      headers: { "Content-Type": "application/json" },
      timeout: 10000
    });

    console.log(`Status code: ${loginRes.status}`);
    if (loginRes.data && loginRes.data.token) {
      console.log("✅ Auto-Login SUCCESS!");
      console.log("Token:", loginRes.data.token);
      
      const token = loginRes.data.token;
      const headers = { Authorization: `Bearer ${token}` };

      // Test Stats
      console.log("\nTesting Dashboard Stats retrieval...");
      const statsRes = await axios.get(`${apiBaseUrl}/api/superadmin/dashboard-stats`, { headers });
      console.log("✅ Dashboard Stats SUCCESS:", JSON.stringify(statsRes.data.stats, null, 2));

      // Test Tenants
      console.log("\nTesting Tenants retrieval...");
      const tenantsRes = await axios.get(`${apiBaseUrl}/api/superadmin/tenants`, { headers });
      console.log("✅ Tenants List SUCCESS! Count:", tenantsRes.data.total);
    } else {
      console.log("❌ Response received but login token is missing:", loginRes.data);
    }
  } catch (err) {
    console.error("❌ Super Admin Login API Connection FAILED!");
    if (err.response) {
      console.error(`Status code: ${err.response.status}`);
      console.error(`Response data: ${typeof err.response.data === 'string' ? err.response.data.substring(0, 300) : JSON.stringify(err.response.data)}`);
      
      if (err.response.status === 404) {
        console.log("\n💡 Note: A 404 error suggests the /api/superadmin/login route is not yet defined or deployed on this server.");
      }
    } else {
      console.error(`Error message: ${err.message}`);
    }
  }
}

testSendzyy();
