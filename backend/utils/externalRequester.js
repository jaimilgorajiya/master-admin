import axios from "axios";

let cachedSendzyyToken = null;
let cachedSendzyyTokenExpiry = null;

const getSendzyyToken = async (baseUrl) => {
  const now = Date.now();
  if (cachedSendzyyToken && cachedSendzyyTokenExpiry && cachedSendzyyTokenExpiry > now + 300000) {
    return cachedSendzyyToken;
  }

  try {
    const loginRes = await axios.post(
      `${baseUrl}/api/superadmin/login`,
      {
        email: "superadmin@sendzyy.com",
        password: "Sendzyy@Admin2026"
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 10000
      }
    );

    if (loginRes.data && loginRes.data.token) {
      cachedSendzyyToken = loginRes.data.token;
      cachedSendzyyTokenExpiry = now + 12 * 60 * 60 * 1000; // 12 hours
      console.log(`✅ [Sendzyy Auto-Login] Successfully generated and cached Super Admin token inside externalRequester from ${baseUrl}`);
      return cachedSendzyyToken;
    }
  } catch (err) {
    console.error(`[Sendzyy Auto-Login Error inside externalRequester] ${err.message}`);
  }
  return null;
};

export const callExternal = async (url, method, data = {}) => {
  const isSendzyyUrl = url.includes("sendzyy.com") || url.includes("192.168.29.110");
  let headers = {
    "Content-Type": "application/json"
  };

  let resolvedMethod = method || "POST";

  if (isSendzyyUrl) {
    let baseUrl = "https://appapi.sendzyy.com";
    try {
      const urlObj = new URL(url);
      baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    } catch (e) {
      // ignore
    }
    const token = await getSendzyyToken(baseUrl);
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  } else {
    headers["x-api-key"] = process.env.HRMS_API_KEY || "hrms_master_admin_secret_key_2026";
  }

  try {
    let response = await axios({
      method: resolvedMethod,
      url,
      data,
      headers,
      timeout: 13000,
      validateStatus: () => true
    });

    if (isSendzyyUrl && (response.status === 401 || response.status === 403)) {
      console.warn("[externalRequester] Sendzyy token expired or rejected. Refreshing token and retrying...");
      cachedSendzyyToken = null;
      let baseUrl = "https://appapi.sendzyy.com";
      try {
        const urlObj = new URL(url);
        baseUrl = `${urlObj.protocol}//${urlObj.host}`;
      } catch (e) { }
      const token = await getSendzyyToken(baseUrl);
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        response = await axios({
          method: resolvedMethod,
          url,
          data,
          headers,
          timeout: 13000,
          validateStatus: () => true
        });
      }
    }

    return response;
  } catch (err) {
    console.error(`[externalRequester Error] ${err.message}`);
    throw err;
  }
};
