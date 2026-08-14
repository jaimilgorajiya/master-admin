import axios from "axios";

const email = "superadmin@sendzyy.com";
const password = "Sendzyy@Admin2026";
const apiBaseUrl = "https://appapi.sendzyy.com";
const tenantId = "6a799354bf0fc9ea4075def3"; // Global Wellness Center 3

async function testToggle() {
  try {
    const loginRes = await axios.post(`${apiBaseUrl}/api/superadmin/login`, {
      email,
      password
    });
    const token = loginRes.data.token;
    const headers = { Authorization: `Bearer ${token}` };

    console.log(`Setting status of ${tenantId} to inactive...`);
    const toggleRes = await axios.patch(
      `${apiBaseUrl}/api/superadmin/tenants/${tenantId}/status`,
      { status: "inactive" },
      { headers }
    );
    console.log("Toggle status response status:", toggleRes.status);
    console.log("Toggle status response data:", JSON.stringify(toggleRes.data, null, 2));

    // Fetch again
    const tenantsRes = await axios.get(`${apiBaseUrl}/api/superadmin/tenants`, { headers });
    const tenant = tenantsRes.data.tenants.find(t => t.id === tenantId || t._id === tenantId);
    console.log(`\nUpdated Tenant status on Sendzyy: ${tenant?.status}`);

  } catch (err) {
    if (err.response) {
      console.error("Failed:", err.response.status, err.response.data);
    } else {
      console.error("Failed:", err.message);
    }
  }
}

testToggle();
