# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## CodeGraph (required)

This repo is indexed by CodeGraph (`.codegraph/` at repo root). Always use it for reading and searching code here, instead of grep/find/Read as a first resort:

- **MCP tool**: `codegraph_explore` — name a file or symbol in the query to get its verbatim, line-numbered source plus call paths (including dynamic-dispatch hops).
- **Shell**: `codegraph explore "<symbol names or question>"` for the same output from the CLI.

Keep the index in sync with `codegraph sync` (or `codegraph index` for a full rebuild) after significant file changes.

## Code changes: always delegate to a subagent

Any code modification (new files, edits, refactors) in this repo must be handed off to a subagent (`fork` if it should inherit the current conversation's context, otherwise a fresh agent with a self-contained brief) rather than edited directly in the main conversation. Keep the main thread for research, planning, and reviewing the subagent's result — not the implementation diffs themselves.

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

### QA Request/Review Workflow (`backend/` + `frontend/`)

**Purpose:** Lets a developer request QA review directly from an occupied environment card. The system auto-assigns the next available reviewer from that *same team's* QA roster, notifies the team's existing Slack webhook with actionable links, and tracks the request through rejection/reassignment, start, and completion.

**Backend:**

- **`models/QaMember.js`** — one QA reviewer per team roster: `name`, `slackUserId`, `team` (lowercase, required — rosters are per-team, not global), `active`, `lastAssignedAt`. Compound index `{team, active}` (every query filters on both together).
- **`models/QaRequest.js`** — one QA request: `jiraKey`/`jiraSummary`/`jiraUrl`, `requesterId`/`reviewerId` (ref `QaMember`), `status` (`pending` / `in_progress` / `approved` / `changes_requested` / `unassignable`), `environmentName`, `team`, `rejections[]` (`reviewerId` + `reason` + `rejectedAt`), `assignedAt`, `lastReminderAt`, `acceptedAt`, `completedAt`, `escalatedCount`.
- **`services/qaAssignment.js`** — pure, DB-free assignment algorithm. `pickReviewer(candidates, excludeMemberIds)` filters out excluded ids, then sorts by `compareByQueuePriority`: **lowest active QA load wins; ties are broken by oldest `lastAssignedAt`, with never-assigned (`null`) sorting first.** This one function is the single source of truth for both who actually gets assigned and the "who's next" ordering shown in the dashboard/members list, so the two can never drift apart. Fully unit-testable in isolation (no I/O).
- **`services/qaRequestsService.js`** — everything DB-touching:
  - `createQaRequest` — rejects the literal `"shared"` team placeholder outright (a shared environment not currently resolved to an occupying team has no QA roster and never should), verifies the requester belongs to the request's team, excludes the requester, picks a reviewer via `pickReviewer`, and sets `status: 'unassignable'` if none are eligible.
  - `rejectQaRequest` — records the rejection, excludes **every** member who has ever rejected this request (not just the most recent), reassigns via `pickReviewer`, and applies the whole "record rejection + reassign" step as one atomic `findOneAndUpdate` guarded on the previous `reviewerId` — a concurrent double-reject gets a clean 409 instead of computing a reassignment off stale data.
  - `retryQaRequest` — reopens a `changes_requested` request back to `pending` for the **same** reviewer (no reassignment — they already have context).
  - `completeQaRequest` — marks `approved` or `changes_requested`.
  - `sendOverdueReminders` — background job entry point; **resends** (never reassigns) the assignment notification for stale `pending` requests.
  - Defensive invariant checks throw a 500 if a reviewer is ever picked as their own requester (should be unreachable given the exclusion logic, but fails loudly instead of silently saving a broken assignment).
- **`services/qaSlackService.js`** — notifies via the team's *existing* `Team.slackWebhookUrl` Incoming Webhook, the same one deploy/release notifications already use. Messages carry two plain `url`-type Block Kit buttons, **"Iniciar QA" and "Rechazar"**, linking to `${FRONTEND_BASE_URL}/qa/requests/:id/start` and `.../reject` — pages in the deployed frontend, not a Slack interaction callback. **This needs zero additional Slack App configuration: no bot token, no Interactivity, no Signing Secret.** That was a deliberate, hard-won design decision — don't add Slack App config for this feature; if a reviewer needs to act, they click a link that opens the app.
- **`routes/qa.js`** — `GET/POST /api/qa/members`, `PATCH /api/qa/members/:id/active`, `GET /api/qa/requests` (+ `/:id`), `POST /api/qa/requests`, `POST /api/qa/requests/:id/start|reject|retry|complete`. `/members` always requires `?team=`.
- **`jobs/qaEscalation.js`** — plain `setInterval` sweep (no cron dependency), started from `server.js`. Every `QA_ESCALATION_CHECK_INTERVAL_MIN` minutes, resends the Slack notification for any `pending` request whose last touch (`assignedAt`, or `lastReminderAt` once one has been sent) is older than `QA_REMINDER_INTERVAL_HOURS`.

**Frontend (`frontend/src/app/`):**

- **`components/qa-dashboard/`** — the `teams/:slug/qa` page: that team's full request queue plus roster management (add member, toggle active).
- **`components/qa-request-dialog/`** — opened from an occupied `environment-card`; developer supplies the Jira key/summary to request QA.
- **`components/qa-reject-dialog/`** — collects the required rejection reason (used from the QA dashboard).
- **`components/qa-reject-page/`**, **`components/qa-start-page/`** — the pages the Slack "Rechazar"/"Iniciar QA" links open; not team-scoped in the URL, since the request's team resolves server-side from the stored `QaRequest`.
- **`environment-card.component.ts`** — shows the current QA status of an occupied environment and exposes the "Request QA" action.
- **`dashboard.component.ts`** — wires the request dialog to `POST /api/qa/requests`, guarding against requesting QA on an unresolved shared environment.
- **`models/qa.model.ts`** / **`services/qa.service.ts`** — TypeScript interfaces and the HTTP client for all `/api/qa` calls.
- **Routes** (`app.routes.ts`): `teams/:slug/qa`, `qa/requests/:id/start`, `qa/requests/:id/reject`. The old global `/qa` route now redirects to `teams`, since rosters are per-team.

**New environment variables** (`backend/.env.example`):

```
FRONTEND_BASE_URL=http://localhost:4200   # used to build the Slack action-button links
JIRA_BASE_URL=                            # optional; renders jiraKey as a link (string concat, no Jira API call)
QA_REMINDER_INTERVAL_HOURS=4              # how long a pending request goes untouched before a reminder resends
QA_ESCALATION_CHECK_INTERVAL_MIN=15       # how often the background job checks for overdue requests
```

**Tests:** `backend/test/` (run via `cd backend && node --test test/`) — this backend's first automated test infrastructure; everything before it was manual curl walkthroughs (see `TESTING.md`).

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
