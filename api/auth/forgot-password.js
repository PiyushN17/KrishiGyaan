const { getFarmersCollection, handleOptions, normalizeMobile, readJson, requirePost, sendJson } = require("./_mongo");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res) || !requirePost(req, res)) return;

  try {
    const body = await readJson(req);
    const mobile = normalizeMobile(body.mobile);
    const collection = await getFarmersCollection();
    const farmer = await collection.findOne({ mobile });
    if (!farmer) return sendJson(res, 404, { error: "No farmer account found with this mobile number." });
    return sendJson(res, 200, {
      ok: true,
      message: "Account found. Password reset is not automated in this prototype. Please contact support to reset it.",
      farmerName: farmer.fullName || "Registered farmer"
    });
  } catch (error) {
    return sendJson(res, error.status || 500, { error: error.message });
  }
};
