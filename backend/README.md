# StreakLabs backend

Express API for courses, AI study guides, note files, study sessions, and weekly plans. It uses JSON files for local development, with uploaded files stored under `backend/uploads` and app data under `backend/data`.

## Run

```powershell
cd backend
npm install
Copy-Item .env.example .env
npm run dev
```

The API listens on `http://localhost:3001`. Set `FRONTEND_ORIGIN` if the frontend origin differs from `http://localhost:5173`.

## Optional AI generation

Set `AI_API_URL`, `AI_API_KEY`, and `AI_MODEL` in `.env` to enable `POST /api/ai/study-guide`. It accepts `{ "topic": "...", "kind": "lesson|mind-map|cheat-sheet|key-topics|roadmap" }`. No API key is committed to this repository.

## Routes

- `GET /api/health`
- `GET, POST /api/courses`; `PATCH, DELETE /api/courses/:id`
- `POST /api/ai/study-guide`
- `GET, POST /api/notes`; `GET, DELETE /api/notes/:id`; `GET /api/notes/:id/file`
- `GET, POST /api/study/sessions`; `GET /api/study/summary`
- `GET, PUT /api/planner`

This starter backend does not include user accounts or authentication. Add those before deploying user data publicly.
