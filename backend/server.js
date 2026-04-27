const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { MongoClient } = require("mongodb");

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

const PORT = Number(process.env.PORT || 5173);
const FRONTEND_DIR = path.join(__dirname, "..", "frontend");

const CONFIG = {
  groqKey: process.env.GROQ_API_KEY,
  groqKey2: process.env.GROQ_API_KEY2,
  groqModel: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
  groqModel2: process.env.GROQ_MODEL2 || process.env.GROQ_MODEL || "llama-3.1-8b-instant",
  cropKey: process.env.CROP_KINDWISE_API_KEY,
  plantKey: process.env.PLANT_ID_API_KEY,
  mongoUri: process.env.MONGODB_URI,
  mongoDbName: process.env.MONGODB_DB || "krishigyaan"
};

let mongoClient;
let farmersCollection;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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

async function getFarmersCollection() {
  if (!CONFIG.mongoUri) throw new Error("MONGODB_URI is missing in .env");
  if (farmersCollection) return farmersCollection;
  mongoClient = mongoClient || new MongoClient(CONFIG.mongoUri);
  if (!mongoClient.topology?.isConnected?.()) await mongoClient.connect();
  const db = mongoClient.db(CONFIG.mongoDbName);
  farmersCollection = db.collection("farmers");
  await farmersCollection.createIndex({ mobile: 1 }, { unique: true });
  return farmersCollection;
}

function normalizeMobile(value = "") {
  return String(value).replace(/\D/g, "").slice(-10);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
  return { salt, hash };
}

function passwordMatches(password, stored = {}) {
  if (!password || !stored.salt || !stored.hash) return false;
  const incoming = hashPassword(password, stored.salt).hash;
  return crypto.timingSafeEqual(Buffer.from(incoming, "hex"), Buffer.from(stored.hash, "hex"));
}

function publicProfile(farmer = {}) {
  const { passwordHash, passwordSalt, _id, ...profile } = farmer;
  return { ...profile, id: _id?.toString?.() };
}

function cleanProfile(profile = {}) {
  const blocked = new Set(["password", "confirmPassword", "_id", "passwordHash", "passwordSalt"]);
  return Object.fromEntries(Object.entries(profile).filter(([key]) => !blocked.has(key)));
}

async function registerFarmer(body) {
  const mobile = normalizeMobile(body.mobile);
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    const error = new Error("Enter a valid 10 digit Indian mobile number.");
    error.status = 400;
    throw error;
  }
  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,32}$/.test(body.password || "")) {
    const error = new Error("Password must be 8-32 characters and include at least one letter and one number.");
    error.status = 400;
    throw error;
  }

  const collection = await getFarmersCollection();
  const existing = await collection.findOne({ mobile });
  if (existing) {
    const error = new Error("This mobile number is already registered. Please login.");
    error.status = 409;
    throw error;
  }

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
  return { ok: true, profile: publicProfile({ ...farmer, _id: result.insertedId }) };
}

async function loginFarmer(body) {
  const mobile = normalizeMobile(body.mobile);
  const collection = await getFarmersCollection();
  const farmer = await collection.findOne({ mobile });
  if (!farmer || !passwordMatches(body.password, { salt: farmer.passwordSalt, hash: farmer.passwordHash })) {
    const error = new Error("Mobile number or password is incorrect.");
    error.status = 401;
    throw error;
  }
  await collection.updateOne({ _id: farmer._id }, { $set: { lastLoginAt: new Date() } });
  return { ok: true, profile: publicProfile(farmer) };
}

async function lookupForgotPassword(body) {
  const mobile = normalizeMobile(body.mobile);
  const collection = await getFarmersCollection();
  const farmer = await collection.findOne({ mobile });
  if (!farmer) {
    const error = new Error("No farmer account found with this mobile number.");
    error.status = 404;
    throw error;
  }
  return {
    ok: true,
    message: "Account found. Password reset is not automated in this prototype. Please contact support to reset it.",
    farmerName: farmer.fullName || "Registered farmer"
  };
}

function isUsableApiKey(value) {
  return Boolean(value && !/^your_/i.test(value.trim()));
}

function aiTokenLimit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 420;
  return Math.max(120, Math.min(1400, Math.round(parsed)));
}

async function generateWithGroq(prompt, apiKey, model, provider, maxTokens = 420) {
  if (!isUsableApiKey(apiKey)) throw new Error(`${provider} API key is missing or still a placeholder in .env`);
  const data = await proxyJson("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: "You are KrishiBaba, a practical farmer assistant for Indian agriculture. Give concise, safe, low-cost, farmer-friendly guidance."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.35,
      max_tokens: aiTokenLimit(maxTokens)
    })
  });
  return { provider, model, text: data?.choices?.[0]?.message?.content?.trim() || "" };
}

async function generateAiResponse(prompt, maxTokens) {
  let primaryError;
  try {
    return await generateWithGroq(prompt, CONFIG.groqKey, CONFIG.groqModel, "groq-primary", maxTokens);
  } catch (error) {
    primaryError = error;
  }

  try {
    return await generateWithGroq(prompt, CONFIG.groqKey2, CONFIG.groqModel2, "groq-fallback", maxTokens);
  } catch (fallbackError) {
    const error = new Error(`KrishiBaba AI unavailable. Primary Groq failed: ${primaryError.message}. Fallback Groq failed: ${fallbackError.message}`);
    error.status = fallbackError.status || primaryError.status || 500;
    error.data = { primary: primaryError.data, fallback: fallbackError.data };
    throw error;
  }
}

async function handleApi(req, res, pathname) {
  try {
    const body = await readJson(req);

    if (pathname === "/api/ai") {
      if (!body.prompt) return sendJson(res, 400, { error: "Missing prompt" });
      return sendJson(res, 200, await generateAiResponse(body.prompt, body.maxTokens));
    }

    if (pathname === "/api/auth/register") {
      return sendJson(res, 201, await registerFarmer(body));
    }

    if (pathname === "/api/auth/login") {
      return sendJson(res, 200, await loginFarmer(body));
    }

    if (pathname === "/api/auth/forgot-password") {
      return sendJson(res, 200, await lookupForgotPassword(body));
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
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      });
      res.end();
      return;
    }
    if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
    handleApi(req, res, pathname);
    return;
  }

  serveStatic(req, res, pathname);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`KrishiGyaan running at http://127.0.0.1:${PORT}`);
});
