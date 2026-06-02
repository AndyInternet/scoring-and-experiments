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
3. Register the app's **production** `/api/inngest` URL in the Inngest Cloud
   dashboard — use the stable production domain (e.g.
   `https://<your-app>.vercel.app/api/inngest`), **not** a deployment-specific
   preview URL (`...-<hash>-....vercel.app`), which changes every deploy.

## Deploying behind Vercel protection

Vercel's Deployment Protection (Vercel Authentication or Password Protection)
guards the **entire** deployment — including `/api/inngest`. Inngest reaches that
endpoint with server-to-server HTTP calls for both the initial sync **and every
function invocation**, and those calls can't log in through Vercel's auth wall. So
protection that's left fully on blocks runs entirely (the sync fails with "We could
not reach your URL", returning HTTP 401).

To keep the browser UI protected while letting Inngest through, use **Protection
Bypass for Automation**:

1. Vercel → Project → Settings → Deployment Protection. Turn on the protection you
   want for the UI (Vercel Authentication or Password Protection), and enable
   **Protection Bypass for Automation**. Vercel generates a secret (also exposed as
   the `VERCEL_AUTOMATION_BYPASS_SECRET` env var).
2. Register the serve URL in Inngest Cloud **with the bypass as a query param**:
   ```
   https://<prod-domain>/api/inngest?x-vercel-protection-bypass=<SECRET>&x-vercel-set-bypass-cookie=true
   ```
   Inngest preserves this query string and appends its own params (`fnId`,
   `stepId`, …), so both sync and runtime calls bypass the auth wall. Direct browser
   visits to the app (without the secret) stay gated.
3. Verify before syncing: `curl -sI "https://<prod-domain>/api/inngest?x-vercel-protection-bypass=<SECRET>"`
   should return `200`, not `401`.

Treat the bypass secret like a credential — anyone with it can reach protected
deployments. Rotate it from the same settings page if leaked.

Simpler alternative (no UI protection): turn Deployment Protection off entirely and
register the bare production `/api/inngest` URL.

## Environment variables

See `.env.example`. All are optional for local development.

| Variable               | Purpose                                                        |
| ---------------------- | ------------------------------------------------------------- |
| `INNGEST_SIGNING_KEY`  | Set in production to target Inngest Cloud.                    |
| `INNGEST_EVENT_KEY`    | Event ingestion key for Inngest Cloud.                        |
| `DASHBOARD_URL`        | Override the base URL used for "view run" links.              |
| `INNGEST_ENV`          | Cloud env slug in dashboard run links (default `production`). |
