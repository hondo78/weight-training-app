# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"IRON LOG": a weight-training tracker (plans, live workout sessions, set logging with RPE, progress charts, body measurements). LAN-only, no auth. Three containers: React SPA served by nginx, an Express API, and Postgres 16 (plus pgAdmin).

## Commands

```bash
docker compose up -d --build            # build & run everything
docker compose up -d --build backend    # rebuild just the API after server.js changes
docker compose logs -f backend
docker exec -it weight_training_db psql -U trainer -d weight_training
```

Ports (host): frontend **3002** (LAN), API **3011** and pgAdmin **5052** bound to `127.0.0.1` only (pgAdmin runs in desktop mode without login; the SPA reaches the API via nginx on the compose network) — 3001/5050 are taken by Transcribor. The compose network is pinned to `192.168.102.0/24` because Docker's default address pools are exhausted on this host; avoid `192.168.101.0/24`, which Tailscale routes elsewhere. The DB has **no host port** (removed on purpose to avoid clashing with other Postgres instances), so a natively run backend needs some other reachable DB via `DATABASE_URL`.

Frontend dev: `cd frontend && npm run dev` — Vite proxies `/api` to `API_TARGET` (default `http://localhost:3011`, i.e. the Docker backend). Backend dev: `PORT=<free port> npm run dev` (`node --watch`; `PORT` defaults to 3001, which is taken on this host) and point the frontend at it with `API_TARGET`.

There are no tests and no linter.

## Architecture

- **`backend/server.js`** — the entire API in one file: Express + a raw `pg` Pool, hand-written SQL, no ORM, no migration tooling. Multi-statement writes (plan create/update, session create) use an explicit `pool.connect()` + `BEGIN/COMMIT/ROLLBACK` client.
- **`backup.sh`** + `backup` service — `pg_dump -Fc` into `./backups/` at start and every 24 h, prunes after `BACKUP_KEEP_DAYS`. `./backups` is root-owned and gitignored.
- **`init.sql`** — schema + seed data (exercise catalog, three sample plans). It runs **only when the `postgres_data` volume is empty**. Schema changes therefore need to be applied to the running DB manually (`ALTER TABLE ...` via psql) *and* added to `init.sql`; `docker compose down -v` resets everything including user data.
- **`frontend/`** — React 18 + Vite + Tailwind + Recharts + lucide-react. `App.jsx` holds routing and the nav; each route is one self-contained page in `src/pages/` that calls `fetch('/api/...')` directly (each page defines its own `API_BASE = '/api'`; no shared API client or state store). In production, nginx (`frontend/nginx.conf`) serves the SPA and reverse-proxies `/api` to `backend:3001`. Shared code lives in `src/lib/` (`training.js`: Epley e1RM + double-progression suggestion; `syncQueue.js`: localStorage retry queue for `PUT /api/logs/:id`; `activeSession.js`: the running workout per device in localStorage, read by the nav bar and auto-resumed by `Workout.jsx`), `src/components/` (`ui.jsx`: `Modal`, `PageHeader`, `Spinner`, `EmptyState` and `FeedbackProvider`/`useFeedback()` for `confirm()` dialogs and toasts — use these instead of native `confirm`/`alert`; `ExercisePicker`, `RestTimer`, `TrainingCalendar`, `WeeklyVolumeChart`) and `src/hooks/useWakeLock.js`.
- **Styling** — reusable classes (`card`, `surface`, `btn-primary/secondary/danger`, `icon-btn`, `chip`, `input-field`, `set-input`) live inside `@layer components` in `index.css` so Tailwind utilities (`pl-10`, `!py-2`) can override them; keep new component classes there. Number inputs are `type="text"` with `inputMode` so German decimal commas work.
- **PWA** — `public/manifest.webmanifest` + hand-written `public/sw.js` (network-first for navigation and `GET /api`, cache-first for hashed `/assets/`). Registered in `main.jsx` only in a secure context, so over plain `http://<LAN-IP>` it is inactive; bump `VERSION` in `sw.js` when changing caching behaviour.

### Domain model

`workout_plans` → `plan_exercises` (target sets/reps/rest, `order_index`) → `exercises`. A `workout_sessions` row optionally references a plan (`ON DELETE SET NULL`) and owns `exercise_logs` (one row per set: weight, reps, rpe 1–10).

Session lifecycle details that span backend and `Workout.jsx`:
- `POST /api/sessions` with a `plan_id` pre-creates placeholder sets (`weight_kg=0, reps=0`, `target_sets` per exercise, default 3) inside the same transaction. Queries for history/records/stats should account for these zero-value rows.
- Sets with `reps = 0` are placeholders: history, records, stats and export filter them with `reps > 0`. The rest timer starts when a set goes from 0 to >0 reps, using the plan's `rest_seconds` (free exercises: 90 s).
- `Workout.jsx` loads a session's logs once and passes them down; a set's ✓ button fills empty fields from placeholders (previous done set in this session > progression suggestion > same set last session). The ✓ handler uses the done-state captured on `pointerdown`, because the input's blur already saves (and may mark the set done) before `click` fires.
- A session is "open" until `completed_at` is set. Open sessions can be resumed as the active workout ("Fortsetzen"). The workout timer is computed client-side from the server's `started_at` (not a local counter); `PUT /api/sessions/:id/complete` sets `completed_at` and computes `duration_minutes` server-side. Past open sessions can be completed from the session list.

## Conventions

- UI strings are German; identifiers and API paths are English.
- Tailwind theme uses custom `iron-*` (neutrals) and `rust-*` (accent) color scales from `tailwind.config.js`, plus a `glass` utility class in `index.css`.
- DB credentials are hardcoded in `docker-compose.yml` and as a fallback in `server.js`; change both together.
