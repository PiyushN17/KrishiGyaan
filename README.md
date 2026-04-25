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
  server.js         Static server and API proxy layer

package.json        Run and check scripts
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
