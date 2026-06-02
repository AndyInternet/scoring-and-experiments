# Scoring & Experiments Demo App — Design

**Date:** 2026-06-02
**Location:** `projects/scoring-and-experiments/`

## Purpose

A minimal, Vercel-deployable Next.js (App Router) app whose UI lets you fire events
that trigger Inngest runs exercising **every scoring primitive** and **every
experiment strategy** introduced in inngest-js PR
[#1521](https://github.com/inngest/inngest-js/pull/1521). The app both *serves*
the Inngest functions (`/api/inngest`) and *triggers* them (`inngest.send()` from a
route handler).

The goal is a hands-on reference: click a scenario, then open the Inngest dashboard
to see the resulting run, scores, and experiment attribution.

## Non-goals

- No inline rendering of run status or score results (no polling). The dashboard is
  the place to inspect outcomes.
- No automated test suite. Success is verified manually end-to-end (see Verification).
- No custom authentication. Access control is delegated to Vercel's native
  Deployment Protection (password) in production; the app is open when run locally.

## SDK dependency

PR #1521 is published to npm as a prerelease build:
[`inngest@4.4.1-pr-1521.15`](https://www.npmjs.com/package/inngest/v/4.4.1-pr-1521.15)
(produced by the `prerelease/inngest` CI label). The app pins it exactly:

```jsonc
"dependencies": {
  "inngest": "4.4.1-pr-1521.15"
}
```

This keeps the app self-contained and Vercel-deployable with no dependency on the
local `inngest-js` workspace checkout and no build/pack step. The `inngest/experimental`
subpath (`scoreMiddleware`, `createScorer`) and the `experiment`/`score` exports all
ship in this build.

## Architecture

```
Browser (Radix Themes UI + Motion micro-interactions)
   │  POST /api/trigger { scenario, count, params }
   ▼
Next.js route handler ──inngest.send(event)──►  Inngest (dev server | Cloud)
                                                      │
   /api/inngest  ◄──────── executes functions ────────┘
   (serve from "inngest/next")
```

### Connection (env-driven)

No code branching for dev vs prod. The SDK auto-detects:

- **Local (default):** with no signing/event keys, the SDK targets the local dev
  server (`npx inngest-cli dev`, default `http://localhost:8288`). The app serves
  functions at `/api/inngest`; the dev server auto-discovers and registers them.
- **Cloud (Vercel prod):** when `INNGEST_SIGNING_KEY` and `INNGEST_EVENT_KEY` are
  set, the SDK targets Inngest Cloud automatically.

A `DASHBOARD_URL` (or derived default) is used to build the "view in dashboard" link:
`http://localhost:8288` for dev, `https://app.inngest.com` for cloud.

### Access control

Production protection is configured in the Vercel dashboard (Deployment Protection →
Password). No app-level auth code. The README documents enabling it.

### Theme

`<Theme>` from `@radix-ui/themes` wraps the app. `next-themes` drives a
light/dark/system toggle persisted to `localStorage`, wired to Radix's `appearance`.

## Inngest function catalog

Client in `inngest/client.ts`:

```ts
import { Inngest } from "inngest";
import { scoreMiddleware } from "inngest/experimental";

export const inngest = new Inngest({
  id: "scoring-and-experiments-demo",
  middleware: [scoreMiddleware()], // gates step.score()
});
```

### Scoring primitives — `inngest/scoring.ts`

| Function id          | Primitive                          | Detail                                                                    |
| -------------------- | ---------------------------------- | ------------------------------------------------------------------------- |
| `score-step-durable` | `step.score(id, { stepId, … })`    | Step-scoped durable score. Emits one numeric + one boolean. *Recommended pattern.* |
| `score-run-durable`  | `step.score(id, { … })` no stepId  | Run-scoped durable score (attaches to the run).                           |
| `score-live-api`     | `inngest.score({ … })`             | Live API write called **inside** a `step.run()`; demonstrates run- and step-scoped writes, numeric + boolean. |
| `score-with-scorer`  | `createScorer(client, …)`          | A primary function whose output is scored by a companion scorer (defer).  |

### Experiments — `inngest/experiments.ts`

Each function runs two variants via `group.experiment(name, { variants, select })`.
Every variant emits `accuracy-rate` (boolean) and `latency-p95-ms` (numeric) via
`step.score()`, so each strategy produces comparable scored variants.

| Function id    | Strategy                                          |
| -------------- | ------------------------------------------------- |
| `exp-weighted` | `experiment.weighted({ control, challenger })`    |
| `exp-fixed`    | `experiment.fixed("control")`                     |
| `exp-bucket`   | `experiment.bucket(userId, { weights })`          |
| `exp-custom`   | `experiment.custom(fn)`                           |

`inngest/index.ts` aggregates all functions into one array for `serve()`.

## Trigger flow

- `lib/scenarios.ts` — a registry mapping each scenario key to its event name, a
  human label/description, and which params it accepts (e.g. `count`, `userId`,
  `forceVariant`). Shared by the UI and the trigger route as the single source of truth.
- `app/api/trigger/route.ts` — POST handler. Validates the scenario key against the
  registry, builds `count` events with sensible mock data, calls `inngest.send()`,
  returns `{ ok, count, error? }`.
- `app/api/inngest/route.ts` — `serve({ client: inngest, functions })` from
  `inngest/next`.

## UI

Single page (`app/page.tsx`), client component talking to `/api/trigger`.

- Header: app title + theme toggle.
- Two `Card`s: **Scoring primitives** and **Experiments**, each listing its scenarios.
- Each scenario row: label + short description, an optional numeric **count** input
  (default 1), and a **Run** button. Experiment rows that take params (e.g. bucket
  `userId`, custom `forceVariant`) expose a small input/select.
- On fire: the Run button shows a spinner, then a checkmark on success; an animated
  `Callout` slides+fades in with the result and a "View in dashboard →" link.

### Micro-interactions (Motion)

- Scenario rows: subtle hover lift (`y`/shadow) and `whileTap` scale-down.
- Run button: spinner → checkmark transition during/after the fire.
- Result callout: `AnimatePresence` slide + fade in/out.
- Theme toggle: smooth crossfade of the icon.

Animations are tasteful and fast (150–250ms), respecting `prefers-reduced-motion`.

## File layout

```
projects/scoring-and-experiments/
  app/
    layout.tsx              (Theme + ThemeProvider, fonts)
    page.tsx                (UI)
    globals.css
    api/
      inngest/route.ts      (serve)
      trigger/route.ts      (inngest.send)
  components/
    scenario-card.tsx
    scenario-row.tsx
    run-button.tsx
    result-callout.tsx
    theme-toggle.tsx
  inngest/
    client.ts
    scoring.ts
    experiments.ts
    index.ts
  lib/
    scenarios.ts            (scenario registry — single source of truth)
    dashboard.ts            (dashboard base URL resolution)
  .env.example              (INNGEST_* , DASHBOARD_URL)
  package.json
  tsconfig.json
  next.config.ts
  README.md
```

## Error handling

- Trigger route returns structured `{ ok: false, error }` on unknown scenario,
  validation failure, or send error; the UI renders it in a red Radix `Callout`.
- Missing event key in cloud mode surfaces a clear error from the route.

## Verification (manual)

1. `pnpm install` in the project (after packing the SDK tgz).
2. Run `npx inngest-cli dev` (dev server on :8288).
3. `pnpm dev` → open the app, fire each of the 8 scenarios.
4. Confirm in the dev dashboard: each run appears, scoring runs show their scores,
   experiment runs show variant attribution + per-variant scores.

README documents this flow and the Vercel deployment + password-protection steps.

## Open considerations

- Vercel password protection (Deployment Protection) is a paid Vercel feature; noted
  in the README. Local runs are unprotected by design.
- `createScorer` is a companion (defer) function; its wiring (how it's invoked from
  the primary function) will be confirmed against the SDK during implementation.
```