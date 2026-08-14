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
      console.log(`✅ [Sendzyy Auto-Login] Successfully generated and cached Super Admin token from ${baseUrl}`);
      return cachedSendzyyToken;
    }
  } catch (err) {
    console.error(`[Sendzyy Auto-Login Error] ${err.message}`);
  }
  return null;
};

export const proxyExternalRequest = async (req, res) => {
  const { targetUrl, method, data, headers: customHeaders } = req.body;

  if (!targetUrl) {
    return res.status(400).json({ success: false, message: "Target URL is required" });
  }

  try {
    const cleanUrl = targetUrl.includes(':id') ? targetUrl : targetUrl;

    let requestHeaders = {
      "Content-Type": "application/json",
      ...(customHeaders || {})
    };

    const isSendzyyUrl = cleanUrl.includes("sendzyy.com") || cleanUrl.includes("192.168.29.110");

    let baseUrl = "https://appapi.sendzyy.com";
    if (isSendzyyUrl) {
      try {
        const urlObj = new URL(cleanUrl);
        baseUrl = `${urlObj.protocol}//${urlObj.host}`;
      } catch (e) {
        // Fallback to local ip
      }
    }

    if (isSendzyyUrl && !requestHeaders["Authorization"] && !requestHeaders["authorization"]) {
      const sendzyyToken = await getSendzyyToken(baseUrl);
      if (sendzyyToken) {
        requestHeaders["Authorization"] = `Bearer ${sendzyyToken}`;
      }
    } else if (!requestHeaders["Authorization"] && !requestHeaders["authorization"] && !requestHeaders["x-api-key"]) {
      requestHeaders["x-api-key"] = process.env.HRMS_API_KEY || "hrms_master_admin_secret_key_2026";
    }

    let resolvedMethod = method || "GET";

    let response = await axios({
      method: resolvedMethod,
      url: cleanUrl,
      data: data || {},
      headers: requestHeaders,
      timeout: 10000,
      validateStatus: () => true // Allow any status code to be proxied
    });

    if (isSendzyyUrl && (response.status === 401 || response.status === 403)) {
      console.warn("[Proxy] Sendzyy token expired or rejected. Refreshing token and retrying...");
      cachedSendzyyToken = null;
      const freshToken = await getSendzyyToken(baseUrl);
      if (freshToken) {
        requestHeaders["Authorization"] = `Bearer ${freshToken}`;
        response = await axios({
          method: resolvedMethod,
          url: cleanUrl,
          data: data || {},
          headers: requestHeaders,
          timeout: 10000,
          validateStatus: () => true
        });
      }
    }

    res.status(response.status).json(response.data);
  } catch (err) {
    console.error(`[Proxy Error] ${err.message}`);
    res.status(500).json({
      success: false,
      message: `Proxy failed: ${err.message}`,
      error: err.code === 'ERR_NETWORK' ? 'Target unreachable or incorrect port' : err.message
    });
  }
};
