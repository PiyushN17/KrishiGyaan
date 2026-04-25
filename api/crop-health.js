const { handleOptions, proxyJson, readJson, requirePost, sendJson } = require("./_utils");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res) || !requirePost(req, res)) return;
  try {
    if (!process.env.CROP_KINDWISE_API_KEY) return sendJson(res, 500, { error: "CROP_KINDWISE_API_KEY is missing" });
    const body = await readJson(req);
    const data = await proxyJson("https://crop.kindwise.com/api/v1/identification", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Api-Key": process.env.CROP_KINDWISE_API_KEY },
      body: JSON.stringify(body)
    });
    return sendJson(res, 200, data);
  } catch (error) {
    return sendJson(res, error.status || 500, { error: error.message, details: error.data });
  }
};
