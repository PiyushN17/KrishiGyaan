const { cleanProfile, getFarmersCollection, handleOptions, hashPassword, normalizeMobile, publicProfile, readJson, requirePost, sendJson } = require("./_mongo");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res) || !requirePost(req, res)) return;

  try {
    const body = await readJson(req);
    const mobile = normalizeMobile(body.mobile);
    if (!/^[6-9]\d{9}$/.test(mobile)) return sendJson(res, 400, { error: "Enter a valid 10 digit Indian mobile number." });
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,32}$/.test(body.password || "")) {
      return sendJson(res, 400, { error: "Password must be 8-32 characters and include at least one letter and one number." });
    }

    const collection = await getFarmersCollection();
    const existing = await collection.findOne({ mobile });
    if (existing) return sendJson(res, 409, { error: "This mobile number is already registered. Please login." });

    const password = hashPassword(body.password);
    const now = new Date();
    const farmer = {
      ...cleanProfile(body),
      mobile,
      passwordSalt: password.salt,
      passwordHash: password.hash,
      createdAt: now,
      updatedAt: now
    };
    const result = await collection.insertOne(farmer);
    return sendJson(res, 201, { ok: true, profile: publicProfile({ ...farmer, _id: result.insertedId }) });
  } catch (error) {
    return sendJson(res, error.status || 500, { error: error.message });
  }
};
