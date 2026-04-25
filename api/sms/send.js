const { handleOptions, requirePost, sendJson } = require("../_utils");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res) || !requirePost(req, res)) return;

  return sendJson(res, 501, {
    error: "SMS provider is not configured. Add provider credentials and send from backend only."
  });
};
