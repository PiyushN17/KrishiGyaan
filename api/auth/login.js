const { getFarmersCollection, handleOptions, normalizeMobile, passwordMatches, publicProfile, readJson, requirePost, sendJson } = require("./_mongo");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res) || !requirePost(req, res)) return;

  try {
    const body = await readJson(req);
    const mobile = normalizeMobile(body.mobile);
    const collection = await getFarmersCollection();
    const farmer = await collection.findOne({ mobile });
    if (!farmer || !passwordMatches(body.password, { salt: farmer.passwordSalt, hash: farmer.passwordHash })) {
      return sendJson(res, 401, { error: "Mobile number or password is incorrect." });
    }
    await collection.updateOne({ _id: farmer._id }, { $set: { lastLoginAt: new Date() } });
    return sendJson(res, 200, { ok: true, profile: publicProfile(farmer) });
  } catch (error) {
    return sendJson(res, error.status || 500, { error: error.message });
  }
};
