const { handleOptions, proxyJson, readJson, requirePost, sendJson } = require("./_utils");

const GEMINI_MODELS = (process.env.GEMINI_MODELS || "gemini-2.5-flash,gemini-2.0-flash")
  .split(",")
  .map((model) => model.trim())
  .filter(Boolean);
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

async function generateWithGemini(prompt) {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is missing");

  let lastError;
  for (const model of GEMINI_MODELS) {
    try {
      const data = await proxyJson(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.35, maxOutputTokens: 900 }
          })
        }
      );
      const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
      if (text) return { provider: "gemini", model, text };
    } catch (error) {
      lastError = error;
      if (error.status !== 429) break;
    }
  }

  throw lastError || new Error("Gemini did not return text");
}

async function generateWithGroq(prompt) {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is missing");

  const data = await proxyJson("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: "system",
          content: "You are KrishiBaba, a practical farmer assistant for Indian agriculture. Give concise, safe, low-cost, farmer-friendly guidance."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.35,
      max_tokens: 420
    })
  });

  return { provider: "groq", model: GROQ_MODEL, text: data?.choices?.[0]?.message?.content?.trim() || "" };
}

module.exports = async function handler(req, res) {
  if (handleOptions(req, res) || !requirePost(req, res)) return;

  try {
    const body = await readJson(req);
    if (!body.prompt) return sendJson(res, 400, { error: "Missing prompt" });

    try {
      return sendJson(res, 200, await generateWithGemini(body.prompt));
    } catch {
      return sendJson(res, 200, await generateWithGroq(body.prompt));
    }
  } catch (error) {
    return sendJson(res, error.status || 500, { error: error.message, details: error.data });
  }
};
