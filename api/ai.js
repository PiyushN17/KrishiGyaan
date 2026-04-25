const { handleOptions, proxyJson, readJson, requirePost, sendJson } = require("./_utils");

const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const GROQ_MODEL2 = process.env.GROQ_MODEL2 || GROQ_MODEL;

function isUsableApiKey(value) {
  return Boolean(value && !/^your_/i.test(value.trim()));
}

async function generateWithGroq(prompt, apiKey, model, provider) {
  if (!isUsableApiKey(apiKey)) throw new Error(`${provider} API key is missing or still a placeholder`);
  const data = await proxyJson("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "You are KrishiBaba, a practical farmer assistant for Indian agriculture. Give concise, safe, low-cost, farmer-friendly guidance." },
        { role: "user", content: prompt }
      ],
      temperature: 0.35,
      max_tokens: 420
    })
  });
  return { provider, model, text: data?.choices?.[0]?.message?.content?.trim() || "" };
}

async function generateAiResponse(prompt) {
  let primaryError;
  try {
    return await generateWithGroq(prompt, process.env.GROQ_API_KEY, GROQ_MODEL, "groq-primary");
  } catch (error) {
    primaryError = error;
  }

  try {
    return await generateWithGroq(prompt, process.env.GROQ_API_KEY2, GROQ_MODEL2, "groq-fallback");
  } catch (fallbackError) {
    const error = new Error(`KrishiBaba AI unavailable. Primary Groq failed: ${primaryError.message}. Fallback Groq failed: ${fallbackError.message}`);
    error.status = fallbackError.status || primaryError.status || 500;
    error.data = { primary: primaryError.data, fallback: fallbackError.data };
    throw error;
  }
}

module.exports = async function handler(req, res) {
  if (handleOptions(req, res) || !requirePost(req, res)) return;
  try {
    const body = await readJson(req);
    if (!body.prompt) return sendJson(res, 400, { error: "Missing prompt" });
    return sendJson(res, 200, await generateAiResponse(body.prompt));
  } catch (error) {
    return sendJson(res, error.status || 500, { error: error.message, details: error.data });
  }
};
