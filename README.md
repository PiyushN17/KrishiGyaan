# KrishiGyaan

KrishiGyaan is a farming assistant prototype with a public frontend, protected dashboard, AI guidance, crop and plant disease detection, weather advisory, soil guidance, voice support, and SMS-ready daily updates.

## Project Structure

```text
frontend/
  index.html        Public landing, registration, and login
  dashboard.html    Protected farmer dashboard
  styles.css        UI design system and responsive styling
  shared.js         Language, location, voice, and AI helper client
  app.js            Landing page registration/login behavior
  dashboard.js      Dashboard feature behavior

backend/
  server.js         Local static server and API proxy layer

api/
  ai.js             Vercel serverless Gemini/Groq proxy
  crop-health.js    Vercel serverless crop disease proxy
  plant-health.js   Vercel serverless Plant.id proxy
  sms/send.js       Vercel serverless SMS placeholder
  _utils.js         Shared API helpers

package.json        Run and check scripts
vercel.json         Vercel routing from root URLs to frontend files
```

## How To Run

```bash
npm start
```

Open:

```text
http://127.0.0.1:5173
```

## Backend Responsibilities

The backend serves the frontend and proxies sensitive API calls:

- `/api/ai` tries Gemini first, then Groq fallback.
- `/api/crop-health` calls the crop disease API.
- `/api/plant-health` calls Plant.id health assessment.
- `/api/sms/send` is reserved for a real SMS gateway.

For production, move API keys into environment variables instead of hardcoding fallback values.

## Deploy On Vercel

Use this repository root as the Vercel project root. No build command is needed because the frontend is plain HTML, CSS, and JavaScript.

Add these environment variables in Vercel Project Settings:

```text
GEMINI_API_KEY
GEMINI_MODELS
GROQ_API_KEY
GROQ_MODEL
CROP_KINDWISE_API_KEY
PLANT_ID_API_KEY
```

Recommended values:

```text
GEMINI_MODELS=gemini-2.5-flash,gemini-2.0-flash
GROQ_MODEL=llama-3.1-8b-instant
```

Vercel routing:

- `/` and `/index.html` serve `frontend/index.html`
- `/dashboard.html` serves `frontend/dashboard.html`
- `/api/ai`, `/api/crop-health`, `/api/plant-health`, and `/api/sms/send` run as serverless functions

## Frontend Responsibilities

The frontend handles:

- Landing page
- Registration and login demo flow
- Dashboard UI
- Language switching
- Location-based language detection
- Text-to-speech
- Speech-to-text
- Rendering weather, disease, soil, SMS, and AI responses

## Notes

This is a prototype. Real deployment should use proper authentication, a database, backend-secured secrets, and a real SMS provider.
