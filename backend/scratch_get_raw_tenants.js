import axios from "axios";

const email = "superadmin@sendzyy.com";
const password = "Sendzyy@Admin2026";
const apiBaseUrl = "https://appapi.sendzyy.com";

async function getRawTenants() {
  try {
    const loginRes = await axios.post(`${apiBaseUrl}/api/superadmin/login`, {
      email,
      password
    });
    const token = loginRes.data.token;
    const headers = { Authorization: `Bearer ${token}` };

    const tenantsRes = await axios.get(`${apiBaseUrl}/api/superadmin/tenants`, { headers });
    console.log(JSON.stringify(tenantsRes.data, null, 2));
  } catch (err) {
    if (err.response) {
      console.error("Error response:", err.response.status, err.response.data);
    } else {
      console.error("Error:", err.message);
    }
  }
}

getRawTenants();
