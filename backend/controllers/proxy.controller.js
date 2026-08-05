import axios from "axios";

export const proxyExternalRequest = async (req, res) => {
  const { targetUrl, method, data } = req.body;

  if (!targetUrl) {
    return res.status(400).json({ success: false, message: "Target URL is required" });
  }

  try {
    const cleanUrl = targetUrl.includes(':id') ? targetUrl : targetUrl;

    const response = await axios({
      method: method || "GET",
      url: cleanUrl,
      data: data || {},
      headers: {
        "x-api-key": process.env.HRMS_API_KEY || "hrms_master_admin_secret_key_2026",
        "Content-Type": "application/json"
      },
      timeout: 10000,
      validateStatus: () => true // Allow any status code to be proxied
    });

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
