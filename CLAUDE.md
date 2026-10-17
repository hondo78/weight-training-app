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
- **`init.sql`** — schema + seed data (exercise catalog, three sample plans). It runs **only when the `postgres_data` volume is empty**. Schema changes therefore need to be applied to the running DB manually (`ALTER TABLE ...` via psql) *and* added to `init.sql`; `docker compose down -v` resets everything including user data.
- **`frontend/`** — React 18 + Vite + Tailwind + Recharts + lucide-react. `App.jsx` holds routing and the nav; each route is one self-contained page in `src/pages/` that calls `fetch('/api/...')` directly (each page defines its own `API_BASE = '/api'`; no shared API client or state store). In production, nginx (`frontend/nginx.conf`) serves the SPA and reverse-proxies `/api` to `backend:3001`.

### Domain model

`workout_plans` → `plan_exercises` (target sets/reps/rest, `order_index`) → `exercises`. A `workout_sessions` row optionally references a plan (`ON DELETE SET NULL`) and owns `exercise_logs` (one row per set: weight, reps, rpe 1–10).

Session lifecycle details that span backend and `Workout.jsx`:
- `POST /api/sessions` with a `plan_id` pre-creates placeholder sets (`weight_kg=0, reps=0`, `target_sets` per exercise, default 3) inside the same transaction. Queries for history/records/stats should account for these zero-value rows.
- A session is "open" until `completed_at` is set. The workout timer is computed client-side from the server's `started_at` (not a local counter); `PUT /api/sessions/:id/complete` sets `completed_at` and computes `duration_minutes` server-side. Past open sessions can be completed from the session list.

## Conventions

- UI strings are German; identifiers and API paths are English.
- Tailwind theme uses custom `iron-*` (neutrals) and `rust-*` (accent) color scales from `tailwind.config.js`, plus a `glass` utility class in `index.css`.
- DB credentials are hardcoded in `docker-compose.yml` and as a fallback in `server.js`; change both together.
