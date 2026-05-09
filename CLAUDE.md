# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (`backend/`)
```bash
npm start        # production (port 3000)
npm run dev      # development with auto-reload (nodemon)
```

### Frontend (`frontend/`)
```bash
npm start        # dev server (port 4200, proxies to backend)
npm run build    # production build → dist/admin-environments-frontend/
npm run watch    # watch mode build
npm test         # Angular unit tests
```

### Running both together
Start backend first (`npm run dev` in `backend/`), then frontend (`npm start` in `frontend/`). Frontend proxy config points to `localhost:3000`.

## Architecture

**Purpose:** Real-time dashboard for managing two shared dev environments (dev4, test4) — who's using them, what branch is deployed, with Slack notifications and audit history.

```
Angular 17 Frontend (4200)
    ↕ REST + Socket.io
Express Backend (3000)
    ↕ Mongoose
MongoDB Atlas
```

### Backend (`backend/`)

- **`server.js`** — Express + Socket.io entry point. Emits `environment-updated` event to all clients on any state change.
- **`config/db.js`** — MongoDB connection with DNS fallback (configurable via `DNS_SERVERS` env var).
- **`models/Environment.js`** — Current state per environment: `name`, `status` (Libre/Ocupado), `branch`, `deployedBy`, `deployedAt`.
- **`models/EnvironmentHistory.js`** — Append-only audit trail: `environmentName`, `action` (deployed/released), `branch`, `performedBy`, `releasedBy`, `timestamp`.
- **`routes/environments.js`** — All API endpoints. On deploy/release, writes both the `Environment` doc and a new `EnvironmentHistory` doc, then emits the socket event and calls Slack.
- **`services/slackService.js`** — Posts to `SLACK_WEBHOOK_URL`. Fails silently if webhook not configured.

### Frontend (`frontend/src/app/`)

- **`components/dashboard/`** — Main view. Environment cards showing status, deploy/release buttons, per-environment history list. Subscribes to WebSocket for live updates.
- **`components/deploy-dialog/`** — Modal form collecting branch name and developer name before deploy.
- **`services/environment.service.ts`** — HTTP client for all `/api/environments` calls.
- **`services/websocket.service.ts`** — Socket.io client. Surfaces `environment-updated` events as an Observable.
- **`models/environment.model.ts`** — `Environment` and `DeployRequest` TypeScript interfaces.
- **`environments/environment.ts`** — Production API URL (Render.com). `environment.development.ts` — `localhost:3000`.

## Environment Variables

Backend requires `backend/.env` (see `backend/.env.example`):
```
MONGODB_URI=mongodb+srv://...
PORT=3000
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
DNS_SERVERS=8.8.8.8,1.1.1.1   # optional, for DNS fallback
```

## Data Flow: Deploy Action

1. User clicks Deploy → `DeployDialog` opens
2. User submits branch + name → `EnvironmentService.deploy()` → `POST /api/environments/:name/deploy`
3. Route handler updates `Environment` doc, creates `EnvironmentHistory` doc
4. Emits `environment-updated` via Socket.io → all clients refresh their state
5. Calls `slackService` → Slack webhook notification

## Key Constraints

- Only two environments exist: **dev4** and **test4**. These are seeded via `POST /api/environments/init`.
- Frontend uses Angular **standalone components** (no NgModules).
- Production frontend is deployed to Firebase Hosting; backend to Render.com.
- Backend is plain JavaScript (no TypeScript) — keep it that way.
