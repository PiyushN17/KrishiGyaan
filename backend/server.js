const http = require("http");
const fs = require("fs");
const path = require("path");
const connectDB = require("./config/db");
const Farmer = require("./models/Farmer");

function loadEnvFile() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}
loadEnvFile();
console.log("MONGO_URI:", process.env.MONGO_URI);
connectDB();

const PORT = Number(process.env.PORT || 5000);
const FRONTEND_DIR = path.join(__dirname, "..", "public");

const CONFIG = {
  geminiKey: process.env.GEMINI_API_KEY,
  geminiModels: (process.env.GEMINI_MODELS || "gemini-2.5-flash,gemini-2.0-flash").split(",").map((model) => model.trim()).filter(Boolean),
  groqKey: process.env.GROQ_API_KEY,
  groqModel: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
  cropKey: process.env.CROP_KINDWISE_API_KEY,
  plantKey: process.env.PLANT_ID_API_KEY
};

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  });
  res.end(JSON.stringify(data));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 15_000_000) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

async function proxyJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    const message = data?.error?.message || data?.message || response.statusText;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function generateWithGemini(prompt) {
  if (!CONFIG.geminiKey) throw new Error("GEMINI_API_KEY is missing in .env");
  let lastError;
  for (const model of CONFIG.geminiModels) {
    try {
      const data = await proxyJson(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(CONFIG.geminiKey)}`,
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
  if (!CONFIG.groqKey) throw new Error("GROQ_API_KEY is missing in .env");
  const data = await proxyJson("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CONFIG.groqKey}`
    },
    body: JSON.stringify({
      model: CONFIG.groqModel,
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
  return { provider: "groq", model: CONFIG.groqModel, text: data?.choices?.[0]?.message?.content?.trim() || "" };
}

async function handleApi(req, res, pathname) {
  try {
    const body = await readJson(req);

    if (pathname === "/api/ai") {
      if (!body.prompt) return sendJson(res, 400, { error: "Missing prompt" });
      try {
        return sendJson(res, 200, await generateWithGemini(body.prompt));
      } catch {
        return sendJson(res, 200, await generateWithGroq(body.prompt));
      }
    }

    if (pathname === "/api/crop-health") {
      if (!CONFIG.cropKey) return sendJson(res, 500, { error: "CROP_KINDWISE_API_KEY is missing in .env" });
      const data = await proxyJson("https://crop.kindwise.com/api/v1/identification", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Api-Key": CONFIG.cropKey },
        body: JSON.stringify(body)
      });
      return sendJson(res, 200, data);
    }

    if (pathname === "/api/plant-health") {
      if (!CONFIG.plantKey) return sendJson(res, 500, { error: "PLANT_ID_API_KEY is missing in .env" });
      const data = await proxyJson("https://plant.id/api/v3/health_assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Api-Key": CONFIG.plantKey },
        body: JSON.stringify(body)
      });
      return sendJson(res, 200, data);
    }

    if (pathname === "/api/sms/send") {
      return sendJson(res, 501, {
        error: "SMS provider is not configured. Add provider credentials and send from backend only."
      });
    }

    if (pathname === "/api/farmers/register") {
  const mobile = body?.personal?.mobileNumber;

  if (!mobile) {
    return sendJson(res, 400, { error: "Mobile number required" });
  }

  const existing = await Farmer.findOne({
    "personal.mobileNumber": mobile
  });

  if (existing) {
    return sendJson(res, 400, { error: "Farmer already exists" });
  }

  const farmer = new Farmer(body);
  await farmer.save();

  return sendJson(res, 201, {
    message: "Farmer saved successfully 🌾",
    data: farmer
  });
}

    if (pathname === "/api/farmers") {
      const farmers = await Farmer.find();
      return sendJson(res, 200, farmers);
    }
    return sendJson(res, 404, { error: "API route not found" });
  } catch (error) {
    return sendJson(res, error.status || 500, { error: error.message, details: error.data });
  }
}

function serveStatic(req, res, pathname) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(FRONTEND_DIR, requestedPath));

  if (!filePath.startsWith(FRONTEND_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    res.writeHead(200, { "Content-Type": MIME_TYPES[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);

  if (pathname.startsWith("/api/")) {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      });
      res.end();
      return;
    }
    if (!["POST", "GET"].includes(req.method)) return sendJson(res, 405, { error: "Method not allowed" });
    handleApi(req, res, pathname);
    return;
  }

  serveStatic(req, res, pathname);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`KrishiGyaan running at http://127.0.0.1:${PORT}`);
});
