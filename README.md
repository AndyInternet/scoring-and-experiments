# Scoring & Experiments Demo

A minimal Next.js app that fires events triggering Inngest runs which exercise
every scoring primitive and every experiment strategy from inngest-js PR #1521
(`inngest@4.4.1-pr-1521.15`).

The app both **serves** the Inngest functions (at `/api/inngest`) and **triggers**
them (via `/api/trigger`, which calls `inngest.send()`). The UI is trigger-only —
fire a scenario, then follow the dashboard link to inspect the resulting run, its
scores, and experiment attribution.

## Two apps: HTTP and Connect

The same 8 functions are registered as **two separate Inngest apps** that differ
only in transport:

| App id                                | Transport            | Trigger events            |
| ------------------------------------- | -------------------- | ------------------------- |
| `scoring-and-experiments-demo`        | HTTP (`/api/inngest`)| `scoring/…`, `experiments/…` |
| `scoring-and-experiments-connect-demo`| `connect()` WebSocket| `connect/scoring/…`, `connect/experiments/…` |

The function definitions live in factories (`inngest/scoring.ts`,
`inngest/experiments.ts`) that take a client + event prefix, so both apps share one
source of truth. The UI's **HTTP / Connect** toggle picks which app a Run button
fires (the trigger route prefixes the event with `connect/` for the connect app).

## Run locally

```bash
pnpm install

# In one terminal: the Inngest dev server
npx inngest-cli@latest dev

# In another: the app (serves functions at /api/inngest and the UI)
pnpm dev

# Optional third terminal: the connect-worker app (for the "Connect" transport)
pnpm connect
```

Open http://localhost:3000, click a scenario's **Run** button, then follow the
"View in dashboard" link to http://localhost:8288/runs to inspect the run, its
scores, and (for experiments) the variant attribution.

The dev server auto-discovers the HTTP app at `http://localhost:3000/api/inngest`.
No keys are required locally — the SDK targets the dev server automatically.

### Connect worker

`pnpm connect` runs the second app (`inngest/connect-worker.ts`) as a standalone
WebSocket worker against the dev server's connect gateway. It registers itself on
connect — no HTTP endpoint or auto-discovery needed. Use the UI's **Connect**
toggle (or POST `/api/trigger` with `"transport":"connect"`) to fire its functions.

Notes:

- The connect SDK needs a global `WebSocket`. Node 22+ has one built in; on older
  Node the worker polyfills it from the `ws` package, so `pnpm connect` works on
  Node 20+.
- The connect worker is a long-running process — it does **not** run on Vercel.
  Run it on a host/container that can hold a persistent connection (or just locally
  against the dev server).

## Scenarios

**Scoring primitives**

- `step.score()` step-scoped — durable score on a step (numeric + boolean)
- `step.score()` run-scoped — durable score on the run
- `inngest.score()` — live API writes inside `step.run()`
- `createScorer()` — companion scorer that scores the parent run

**Experiments** (each variant emits `accuracy-rate` + `latency-p95-ms` scores)

- `experiment.weighted()`, `experiment.fixed()`, `experiment.bucket()`, `experiment.custom()`

## Deploy to Vercel

1. Push this directory to a git repo and import it into Vercel.
2. Set `INNGEST_SIGNING_KEY` and `INNGEST_EVENT_KEY` (from Inngest Cloud) as env
   vars. With these present the SDK targets Inngest Cloud automatically.
3. Set `APP_PASSWORD` to gate the UI (see "Password protection" below).
4. Register the app's **production** `/api/inngest` URL in the Inngest Cloud
   dashboard — use the stable production domain (e.g.
   `https://<your-app>.vercel.app/api/inngest`), **not** a deployment-specific
   preview URL (`...-<hash>-....vercel.app`), which changes every deploy.

## Password protection

A lightweight, app-level password gate (Next.js middleware) protects every route
**except `/api/inngest`**, which must stay open so Inngest Cloud can sync and invoke
functions over server-to-server HTTP. The login page (`/login`) is also open.

- Set `APP_PASSWORD` in Vercel (Project → Settings → Environment Variables).
- When it's set, unauthenticated page requests redirect to `/login`; submitting the
  correct password sets an httpOnly cookie (a SHA-256 token of the password, valid
  7 days) and the rest of the app unlocks. Other API routes return `401` until then.
- When `APP_PASSWORD` is unset (e.g. local dev), the gate is disabled.

This is intentionally low-security (single shared password), which is why
`/api/inngest` can be left open: it's protected by Inngest request signing in
production, not by this gate. Don't rely on it for sensitive data.

## Environment variables

See `.env.example`. All are optional for local development.

| Variable               | Purpose                                                        |
| ---------------------- | ------------------------------------------------------------- |
| `INNGEST_SIGNING_KEY`  | Set in production to target Inngest Cloud.                    |
| `INNGEST_EVENT_KEY`    | Event ingestion key for Inngest Cloud.                        |
| `DASHBOARD_URL`        | Override the base URL used for "view run" links.              |
| `INNGEST_ENV`          | Cloud env slug in dashboard run links (default `production`). |
| `APP_PASSWORD`         | Password gating all routes except `/api/inngest`. Unset = open. |
