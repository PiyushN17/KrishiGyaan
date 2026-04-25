const { handleOptions, proxyJson, readJson, requirePost, sendJson } = require("./_utils");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res) || !requirePost(req, res)) return;
  try {
    if (!process.env.PLANT_ID_API_KEY) return sendJson(res, 500, { error: "PLANT_ID_API_KEY is missing" });
    const body = await readJson(req);
    const data = await proxyJson("https://plant.id/api/v3/health_assessment", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Api-Key": process.env.PLANT_ID_API_KEY },
      body: JSON.stringify(body)
    });
    return sendJson(res, 200, data);
  } catch (error) {
    return sendJson(res, error.status || 500, { error: error.message, details: error.data });
  }
};
