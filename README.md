# Scoring & Experiments Demo

A minimal Next.js app that fires events triggering Inngest runs which exercise
every scoring primitive and every experiment strategy from inngest-js PR #1521
(`inngest@4.4.1-pr-1521.15`).

The app both **serves** the Inngest functions (at `/api/inngest`) and **triggers**
them (via `/api/trigger`, which calls `inngest.send()`). The UI is trigger-only —
fire a scenario, then follow the dashboard link to inspect the resulting run, its
scores, and experiment attribution.

## Run locally

```bash
pnpm install

# In one terminal: the Inngest dev server
npx inngest-cli@latest dev

# In another: the app (serves functions at /api/inngest and the UI)
pnpm dev
```

Open http://localhost:3000, click a scenario's **Run** button, then follow the
"View in dashboard" link to http://localhost:8288/runs to inspect the run, its
scores, and (for experiments) the variant attribution.

The dev server auto-discovers the app at `http://localhost:3000/api/inngest`. No
keys are required locally — the SDK targets the dev server automatically.

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
3. Register the app's `/api/inngest` URL in the Inngest Cloud dashboard.
4. **Password protection:** enable it in Vercel → Project → Settings → Deployment
   Protection → Password Protection (a paid Vercel feature). No app-level auth is
   implemented by design.

## Environment variables

See `.env.example`. All are optional for local development.

| Variable               | Purpose                                                        |
| ---------------------- | ------------------------------------------------------------- |
| `INNGEST_SIGNING_KEY`  | Set in production to target Inngest Cloud.                    |
| `INNGEST_EVENT_KEY`    | Event ingestion key for Inngest Cloud.                        |
| `DASHBOARD_URL`        | Override the base URL used for "view run" links.              |
