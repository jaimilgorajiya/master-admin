import axios from "axios";

const email = "superadmin@sendzyy.com";
const password = "Sendzyy@Admin2026";
const apiBaseUrl = "https://appapi.sendzyy.com";

async function verifySendzyyTenants() {
  console.log("=== Querying Sendzyy Tenants ===");
  try {
    const loginRes = await axios.post(`${apiBaseUrl}/api/superadmin/login`, {
      email,
      password
    });
    const token = loginRes.data.token;
    const headers = { Authorization: `Bearer ${token}` };

    const tenantsRes = await axios.get(`${apiBaseUrl}/api/superadmin/tenants`, { headers });
    console.log(`\nFound ${tenantsRes.data.total} tenants on Sendzyy backend:`);
    
    tenantsRes.data.tenants.forEach(t => {
      console.log(`- Tenant: ${t.name} (${t.email}) | Status: ${t.status} | Plan: ${t.subscription?.planName}`);
    });
  } catch (err) {
    console.error("Verification failed:", err.message);
  }
}

verifySendzyyTenants();
