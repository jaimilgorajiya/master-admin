import axios from "axios";

async function testSendzyyInvite() {
  const baseUrl = "https://appapi.sendzyy.com";
  console.log(`=== Testing Auto-Login to Sendzyy at: ${baseUrl} ===`);

  let token = null;
  try {
    const loginRes = await axios.post(
      `${baseUrl}/api/superadmin/login`,
      {
        email: "superadmin@sendzyy.com",
        password: "Sendzyy@Admin2026"
      },
      {
        headers: { "Content-Type": "application/json" }
      }
    );
    console.log("Login API call completed.");
    console.log("Login Response Status:", loginRes.status);
    console.log("Login Response Data:", JSON.stringify(loginRes.data, null, 2));
    token = loginRes.data?.token;
  } catch (err) {
    console.error("Login API call failed:", err.message);
    if (err.response) {
      console.error("Login Error Response Status:", err.response.status);
      console.error("Login Error Response Data:", err.response.data);
    }
  }

  if (!token) {
    console.error("No token generated. Exiting.");
    process.exit(1);
  }

  console.log("\n=== Testing payment-invite API with token ===");
  try {
    const inviteRes = await axios.post(
      `${baseUrl}/api/superadmin/tenants/create-payment-invite`,
      {
        name: "Test Tenant Plan",
        email: "jaimilgorajiya4763@gmail.com",
        planId: "panel_12m"
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      }
    );
    console.log("Invite Response Status:", inviteRes.status);
    console.log("Invite Response Data:", JSON.stringify(inviteRes.data, null, 2));
  } catch (err) {
    console.error("Invite API call failed:", err.message);
    if (err.response) {
      console.error("Invite Error Response Status:", err.response.status);
      console.error("Invite Error Response Data:", err.response.data);
    }
  }

  process.exit(0);
}
testSendzyyInvite();


