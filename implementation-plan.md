# Scoring & Experiments Demo App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a minimal, Vercel-deployable Next.js app whose UI fires events that trigger Inngest runs exercising every scoring primitive and every experiment strategy from inngest-js PR #1521.

**Architecture:** A single Next.js (App Router) app that both *serves* the Inngest functions at `/api/inngest` and *triggers* them via a `/api/trigger` route calling `inngest.send()`. Connection is env-driven: the SDK auto-targets a local dev server with no keys, or Inngest Cloud when prod keys are present. The UI is built with `@radix-ui/themes` (light/dark) plus `motion` micro-interactions, and is trigger-only (links out to the dashboard to inspect results).

**Tech Stack:** Next.js 15 (App Router, TypeScript), `inngest@4.4.1-pr-1521.15`, `@radix-ui/themes`, `next-themes`, `motion`, pnpm.

**Testing note:** This project intentionally has **no automated test suite** (per the approved spec — the deliverable is observable runs/scores in the dashboard). Per-task verification gates are **typecheck (`tsc --noEmit`), lint, and build**; the final task is a manual end-to-end verification against the dev server. This is a deliberate deviation from strict TDD, authorized by the spec.

**Git note:** `projects/` is not a git repo. Task 1 initializes `projects/scoring-and-experiments/` as its own git repo so commits work and Vercel can deploy from it.

**All paths below are relative to the workspace root (`inngest-mono/`).** Run all `pnpm`/`git` commands from inside `projects/scoring-and-experiments/`.

---

### Task 1: Scaffold the project

**Files:**
- Create: `projects/scoring-and-experiments/package.json`
- Create: `projects/scoring-and-experiments/tsconfig.json`
- Create: `projects/scoring-and-experiments/next.config.ts`
- Create: `projects/scoring-and-experiments/.gitignore`
- Create: `projects/scoring-and-experiments/next-env.d.ts`

- [ ] **Step 1: Create the project directory and init git**

```bash
mkdir -p projects/scoring-and-experiments
cd projects/scoring-and-experiments
git init
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "scoring-and-experiments",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@radix-ui/themes": "^3.2.1",
    "inngest": "4.4.1-pr-1521.15",
    "motion": "^11.15.0",
    "next": "^15.1.6",
    "next-themes": "^0.4.4",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.7",
    "@types/react": "^19.0.7",
    "@types/react-dom": "^19.0.3",
    "eslint": "^9.18.0",
    "eslint-config-next": "^15.1.6",
    "typescript": "^5.7.3"
  },
  "packageManager": "pnpm@10.0.0"
}
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Write `next.config.ts`**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

- [ ] **Step 5: Write `.gitignore`**

```
node_modules
.next
.env
.env*.local
*.tsbuildinfo
next-env.d.ts
```

- [ ] **Step 6: Write `next-env.d.ts`**

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
```

- [ ] **Step 7: Install dependencies**

Run: `pnpm install`
Expected: completes without error; `inngest@4.4.1-pr-1521.15` resolved.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold next.js project for scoring-and-experiments demo"
```

---

### Task 2: Inngest client and scoring-primitive functions

**Files:**
- Create: `projects/scoring-and-experiments/inngest/client.ts`
- Create: `projects/scoring-and-experiments/inngest/scoring.ts`

- [ ] **Step 1: Write the Inngest client with score middleware**

`inngest/client.ts`:

```ts
import { Inngest } from "inngest";
import { scoreMiddleware } from "inngest/experimental";

// scoreMiddleware() gates step.score(); without it the tool throws at call time.
// No keys => SDK targets the local dev server. With INNGEST_SIGNING_KEY /
// INNGEST_EVENT_KEY set (e.g. on Vercel) it targets Inngest Cloud automatically.
export const inngest = new Inngest({
  id: "scoring-and-experiments-demo",
  middleware: [scoreMiddleware()],
});
```

- [ ] **Step 2: Write the scoring-primitive functions**

`inngest/scoring.ts`:

```ts
import { createScorer } from "inngest/experimental";

import { inngest } from "./client";

/**
 * Every scoring primitive from PR #1521, one function per pattern. Trigger any
 * of these from the UI, then inspect the run + its score(s) in the dashboard.
 */

// 1. step.score() with a stepId => durable, STEP-scoped score. The recommended
//    pattern. Emits one numeric and one boolean score against the same step.
export const scoreStepDurable = inngest.createFunction(
  { id: "score-step-durable", retries: 0, triggers: { event: "scoring/step-durable.run" } },
  async ({ step }) => {
    const work = await step.run("do-work", () => {
      const latencyMs = 120 + Math.round((Math.random() - 0.5) * 80);
      return { ok: Math.random() < 0.9, latencyMs };
    });

    await step.score("quality", {
      stepId: "quality",
      name: "quality-rate",
      value: work.ok,
    });
    await step.score("latency", {
      stepId: "latency",
      name: "latency-p95-ms",
      value: Math.max(0, (500 - work.latencyMs) / 500),
    });

    return work;
  },
);

// 2. step.score() WITHOUT a stepId => durable, RUN-scoped score (attaches to the run).
export const scoreRunDurable = inngest.createFunction(
  { id: "score-run-durable", retries: 0, triggers: { event: "scoring/run-durable.run" } },
  async ({ step }) => {
    const value = await step.run("compute", () => Math.random());
    await step.score("run-quality", { name: "run-quality", value });
    return { value };
  },
);

// 3. inngest.score() => LIVE API write, called inside step.run(). Demonstrates
//    both a run-scoped and a step-scoped live write.
export const scoreLiveApi = inngest.createFunction(
  { id: "score-live-api", retries: 0, triggers: { event: "scoring/live-api.run" } },
  async ({ runId, step }) => {
    await step.run("score-run-live", async () => {
      await inngest.score({ runId, name: "live-run-quality", value: 0.83 });
    });
    await step.run("score-step-live", async () => {
      // step-scoped live write: target a step id explicitly.
      await inngest.score({ runId, stepId: "score-step-live", name: "live-pass", value: true });
    });
    return { ok: true };
  },
);

// 4. createScorer() companion. The primary function defers to the scorer, which
//    writes a score scoped to the PARENT run when the parent finalizes.
export const accuracyScorer = createScorer(
  inngest,
  { id: "accuracy-scorer" },
  async ({ event }) => {
    const { answer, expected } = event.data as { answer: string; expected: string };
    // Returned object is forwarded to client.score(); runId defaults to the parent run.
    return { name: "accuracy-rate", value: answer === expected };
  },
);

export const scoreWithScorer = inngest.createFunction(
  { id: "score-with-scorer", retries: 0, triggers: { event: "scoring/with-scorer.run" } },
  async ({ event, step, defer }) => {
    const expected = (event.data as { expected: string }).expected;
    const result = await step.run("produce-answer", () => {
      const correct = Math.random() < 0.85;
      return { answer: correct ? expected : "wrong", expected };
    });

    // Fire-and-forget: scorer runs after this run finalizes and scores it.
    defer("score-output", { function: accuracyScorer, data: result });

    return result;
  },
);
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS (no errors). If `defer` or `createScorer` types mismatch, reconcile against `inngest-js/packages/inngest/src/components/ScoreFunction.ts` and `.../execution/defer.md`.

- [ ] **Step 4: Commit**

```bash
git add inngest/client.ts inngest/scoring.ts
git commit -m "feat: add inngest client and scoring-primitive functions"
```

---

### Task 3: Experiment functions and function aggregation

**Files:**
- Create: `projects/scoring-and-experiments/inngest/experiments.ts`
- Create: `projects/scoring-and-experiments/inngest/index.ts`

- [ ] **Step 1: Write the experiment functions**

`inngest/experiments.ts`. Each strategy runs two variants; every variant emits an
`accuracy-rate` (boolean) and `latency-p95-ms` (numeric) score via `step.score()`.

```ts
import { experiment } from "inngest";

import { inngest } from "./client";

// Shared variant body: produces a mock answer + latency, scores both.
function makeVariant(accuracy: number, baseLatency: number, idPrefix: string) {
  return async (
    step: Parameters<Parameters<typeof inngest.createFunction>[1]>[0]["step"],
    expected: string,
  ) => {
    const response = await step.run(`${idPrefix}-response`, () => {
      const correct = Math.random() < accuracy;
      return {
        answer: correct ? expected : "wrong",
        latencyMs: baseLatency + Math.round((Math.random() - 0.5) * 60),
      };
    });
    await step.score(`${idPrefix}-accuracy`, {
      stepId: `${idPrefix}-accuracy`,
      name: "accuracy-rate",
      value: response.answer === expected,
    });
    await step.score(`${idPrefix}-latency`, {
      stepId: `${idPrefix}-latency`,
      name: "latency-p95-ms",
      value: Math.max(0, (500 - response.latencyMs) / 500),
    });
    return response;
  };
}

// 1. weighted — 50/50 split, seeded per run.
export const expWeighted = inngest.createFunction(
  { id: "exp-weighted", retries: 0, triggers: { event: "experiments/weighted.run" } },
  async ({ event, group, step }) => {
    const { expected } = event.data as { expected: string };
    return group.experiment("weighted-checkout-flow", {
      variants: {
        control: () => makeVariant(0.8, 180, "control")(step, expected),
        challenger: () => makeVariant(0.92, 250, "challenger")(step, expected),
      },
      select: experiment.weighted({ control: 50, challenger: 50 }),
    });
  },
);

// 2. fixed — always the named variant.
export const expFixed = inngest.createFunction(
  { id: "exp-fixed", retries: 0, triggers: { event: "experiments/fixed.run" } },
  async ({ event, group, step }) => {
    const { expected } = event.data as { expected: string };
    return group.experiment("fixed-prompt-rev", {
      variants: {
        control: () => makeVariant(0.8, 180, "control")(step, expected),
        challenger: () => makeVariant(0.92, 250, "challenger")(step, expected),
      },
      select: experiment.fixed("control"),
    });
  },
);

// 3. bucket — consistent hash of userId into a weighted variant.
export const expBucket = inngest.createFunction(
  { id: "exp-bucket", retries: 0, triggers: { event: "experiments/bucket.run" } },
  async ({ event, group, step }) => {
    const { expected, userId } = event.data as { expected: string; userId: string };
    return group.experiment("bucket-user-cohort", {
      variants: {
        a: () => makeVariant(0.7, 150, "a")(step, expected),
        b: () => makeVariant(0.95, 300, "b")(step, expected),
      },
      select: experiment.bucket(userId, { weights: { a: 70, b: 30 } }),
    });
  },
);

// 4. custom — user-supplied selection function.
export const expCustom = inngest.createFunction(
  { id: "exp-custom", retries: 0, triggers: { event: "experiments/custom.run" } },
  async ({ event, group, step }) => {
    const { expected, forceVariant } = event.data as {
      expected: string;
      forceVariant?: "control" | "challenger";
    };
    return group.experiment("custom-feature-flag", {
      variants: {
        control: () => makeVariant(0.8, 180, "control")(step, expected),
        challenger: () => makeVariant(0.92, 250, "challenger")(step, expected),
      },
      select: experiment.custom(() => forceVariant ?? "control"),
    });
  },
);
```

- [ ] **Step 2: Typecheck the experiments file in isolation**

Run: `pnpm typecheck`
Expected: PASS. If the `makeVariant` helper's `step` type is awkward, inline the
variant bodies instead (as the reference example in
`projects/experiments-score-migration/example-experiement-score/inngest/experiments.ts`
does) — correctness over DRY here.

- [ ] **Step 3: Write the function aggregator**

`inngest/index.ts`:

```ts
import type { InngestFunction } from "inngest";

import { inngest } from "./client";
import * as experiments from "./experiments";
import * as scoring from "./scoring";

export const functions = [
  ...Object.values(scoring),
  ...Object.values(experiments),
] as InngestFunction.Any[];

export { inngest };
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add inngest/experiments.ts inngest/index.ts
git commit -m "feat: add experiment functions and aggregate function registry"
```

---

### Task 4: Scenario registry, serve route, and trigger route

**Files:**
- Create: `projects/scoring-and-experiments/lib/scenarios.ts`
- Create: `projects/scoring-and-experiments/lib/dashboard.ts`
- Create: `projects/scoring-and-experiments/app/api/inngest/route.ts`
- Create: `projects/scoring-and-experiments/app/api/trigger/route.ts`

- [ ] **Step 1: Write the dashboard URL resolver**

`lib/dashboard.ts`:

```ts
// Resolves the base URL of the Inngest dashboard for "view run" links.
// DASHBOARD_URL overrides; otherwise cloud when a signing key is present, else dev.
export function dashboardBaseUrl(): string {
  if (process.env.DASHBOARD_URL) return process.env.DASHBOARD_URL;
  if (process.env.INNGEST_SIGNING_KEY) return "https://app.inngest.com";
  return "http://localhost:8288";
}
```

- [ ] **Step 2: Write the scenario registry (single source of truth)**

`lib/scenarios.ts`:

```ts
// The registry shared by the UI and the trigger route. Each scenario maps to an
// event name and declares which params it accepts, plus how to build event data.

export type ParamKind = "count" | "userId" | "forceVariant";

export type Scenario = {
  key: string;
  group: "scoring" | "experiments";
  label: string;
  description: string;
  event: string;
  params: ParamKind[];
  // Builds the `data` for one event from the submitted params.
  buildData: (params: TriggerParams) => Record<string, unknown>;
};

export type TriggerParams = {
  count?: number;
  userId?: string;
  forceVariant?: "control" | "challenger";
};

const EXPECTED = "42"; // deterministic correct answer for the mock variants

export const scenarios: Scenario[] = [
  {
    key: "score-step-durable",
    group: "scoring",
    label: "step.score() — step-scoped",
    description: "Durable score attached to a step (numeric + boolean). Recommended pattern.",
    event: "scoring/step-durable.run",
    params: ["count"],
    buildData: () => ({}),
  },
  {
    key: "score-run-durable",
    group: "scoring",
    label: "step.score() — run-scoped",
    description: "Durable score attached to the run (no stepId).",
    event: "scoring/run-durable.run",
    params: ["count"],
    buildData: () => ({}),
  },
  {
    key: "score-live-api",
    group: "scoring",
    label: "inngest.score() — live API write",
    description: "Live score writes inside step.run(), both run- and step-scoped.",
    event: "scoring/live-api.run",
    params: ["count"],
    buildData: () => ({}),
  },
  {
    key: "score-with-scorer",
    group: "scoring",
    label: "createScorer() companion",
    description: "Primary function defers to a scorer that scores the parent run.",
    event: "scoring/with-scorer.run",
    params: ["count"],
    buildData: () => ({ expected: EXPECTED }),
  },
  {
    key: "exp-weighted",
    group: "experiments",
    label: "experiment.weighted()",
    description: "50/50 split between control and challenger, each scored.",
    event: "experiments/weighted.run",
    params: ["count"],
    buildData: () => ({ expected: EXPECTED }),
  },
  {
    key: "exp-fixed",
    group: "experiments",
    label: "experiment.fixed()",
    description: "Always selects 'control'. Both variants scored when run.",
    event: "experiments/fixed.run",
    params: ["count"],
    buildData: () => ({ expected: EXPECTED }),
  },
  {
    key: "exp-bucket",
    group: "experiments",
    label: "experiment.bucket()",
    description: "Consistent hash of a userId into variant a (70%) or b (30%).",
    event: "experiments/bucket.run",
    params: ["count", "userId"],
    buildData: (p) => ({ expected: EXPECTED, userId: p.userId || "user-0001" }),
  },
  {
    key: "exp-custom",
    group: "experiments",
    label: "experiment.custom()",
    description: "User-supplied selection; pick which variant to force.",
    event: "experiments/custom.run",
    params: ["count", "forceVariant"],
    buildData: (p) => ({ expected: EXPECTED, forceVariant: p.forceVariant ?? "control" }),
  },
];

export function getScenario(key: string): Scenario | undefined {
  return scenarios.find((s) => s.key === key);
}
```

- [ ] **Step 3: Write the Inngest serve route**

`app/api/inngest/route.ts`:

```ts
import { serve } from "inngest/next";

import { functions, inngest } from "@/inngest";

export const { GET, POST, PUT } = serve({ client: inngest, functions });
```

- [ ] **Step 4: Write the trigger route**

`app/api/trigger/route.ts`:

```ts
import { NextResponse } from "next/server";

import { inngest } from "@/inngest";
import { dashboardBaseUrl } from "@/lib/dashboard";
import { getScenario, type TriggerParams } from "@/lib/scenarios";

export async function POST(req: Request) {
  let body: { scenario?: string; params?: TriggerParams };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const scenario = body.scenario ? getScenario(body.scenario) : undefined;
  if (!scenario) {
    return NextResponse.json({ ok: false, error: "Unknown scenario" }, { status: 400 });
  }

  const params = body.params ?? {};
  const count = Math.min(Math.max(Number(params.count ?? 1) || 1, 1), 100);

  const events = Array.from({ length: count }, () => ({
    name: scenario.event,
    data: scenario.buildData(params),
  }));

  try {
    await inngest.send(events);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send events";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    count,
    dashboardUrl: `${dashboardBaseUrl()}/runs`,
  });
}
```

- [ ] **Step 5: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/ app/api/
git commit -m "feat: add scenario registry, serve route, and trigger route"
```

---

### Task 5: UI — theme provider, components, and page

**Files:**
- Create: `projects/scoring-and-experiments/app/globals.css`
- Create: `projects/scoring-and-experiments/components/theme-provider.tsx`
- Create: `projects/scoring-and-experiments/components/theme-toggle.tsx`
- Create: `projects/scoring-and-experiments/components/run-button.tsx`
- Create: `projects/scoring-and-experiments/components/result-callout.tsx`
- Create: `projects/scoring-and-experiments/components/scenario-row.tsx`
- Create: `projects/scoring-and-experiments/components/scenario-card.tsx`
- Create: `projects/scoring-and-experiments/app/layout.tsx`
- Create: `projects/scoring-and-experiments/app/page.tsx`

- [ ] **Step 1: Write `app/globals.css`**

```css
@import "@radix-ui/themes/styles.css";

html,
body {
  margin: 0;
  padding: 0;
}

/* Respect reduced-motion globally for the Motion micro-interactions. */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}
```

- [ ] **Step 2: Write the theme provider**

`components/theme-provider.tsx`:

```tsx
"use client";

import { Theme } from "@radix-ui/themes";
import { ThemeProvider as NextThemes, useTheme } from "next-themes";

function RadixWithAppearance({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  return (
    <Theme appearance={resolvedTheme === "dark" ? "dark" : "light"} accentColor="indigo" radius="large">
      {children}
    </Theme>
  );
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="system" enableSystem>
      <RadixWithAppearance>{children}</RadixWithAppearance>
    </NextThemes>
  );
}
```

- [ ] **Step 3: Write the theme toggle (with icon crossfade)**

`components/theme-toggle.tsx`:

```tsx
"use client";

import { MoonIcon, SunIcon } from "@radix-ui/react-icons";
import { IconButton } from "@radix-ui/themes";
import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <IconButton
      variant="soft"
      aria-label="Toggle color theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={mounted ? (isDark ? "moon" : "sun") : "placeholder"}
          initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
          transition={{ duration: 0.2 }}
          style={{ display: "inline-flex" }}
        >
          {isDark ? <MoonIcon /> : <SunIcon />}
        </motion.span>
      </AnimatePresence>
    </IconButton>
  );
}
```

> Note: `@radix-ui/react-icons` is a transitive dep of `@radix-ui/themes`. If the
> import fails to resolve, add `"@radix-ui/react-icons": "^1.3.2"` to dependencies
> and re-run `pnpm install`.

- [ ] **Step 4: Write the run button (spinner → checkmark)**

`components/run-button.tsx`:

```tsx
"use client";

import { CheckIcon } from "@radix-ui/react-icons";
import { Button, Spinner } from "@radix-ui/themes";
import { AnimatePresence, motion } from "motion/react";

type Status = "idle" | "loading" | "success";

export function RunButton({ status, onRun }: { status: Status; onRun: () => void }) {
  return (
    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} style={{ display: "inline-block" }}>
      <Button onClick={onRun} disabled={status === "loading"} variant="solid">
        <AnimatePresence mode="wait" initial={false}>
          {status === "loading" ? (
            <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Spinner />
            </motion.span>
          ) : status === "success" ? (
            <motion.span
              key="success"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: "inline-flex" }}
            >
              <CheckIcon />
            </motion.span>
          ) : (
            <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              Run
            </motion.span>
          )}
        </AnimatePresence>
      </Button>
    </motion.div>
  );
}
```

- [ ] **Step 5: Write the result callout (slide + fade)**

`components/result-callout.tsx`:

```tsx
"use client";

import { CrossCircledIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import { Callout, Link } from "@radix-ui/themes";
import { AnimatePresence, motion } from "motion/react";

export type RunResult =
  | { ok: true; count: number; dashboardUrl: string }
  | { ok: false; error: string };

export function ResultCallout({ result }: { result: RunResult | null }) {
  return (
    <AnimatePresence>
      {result && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          <Callout.Root color={result.ok ? "green" : "red"} mt="3">
            <Callout.Icon>
              {result.ok ? <InfoCircledIcon /> : <CrossCircledIcon />}
            </Callout.Icon>
            <Callout.Text>
              {result.ok ? (
                <>
                  Sent {result.count} event{result.count === 1 ? "" : "s"}.{" "}
                  <Link href={result.dashboardUrl} target="_blank" rel="noreferrer">
                    View in dashboard →
                  </Link>
                </>
              ) : (
                result.error
              )}
            </Callout.Text>
          </Callout.Root>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 6: Write the scenario row**

`components/scenario-row.tsx`:

```tsx
"use client";

import { Flex, Select, Text, TextField } from "@radix-ui/themes";
import { motion } from "motion/react";
import { useState } from "react";

import { RunButton } from "./run-button";
import { ResultCallout, type RunResult } from "./result-callout";
import type { Scenario, TriggerParams } from "@/lib/scenarios";

export function ScenarioRow({ scenario }: { scenario: Scenario }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [result, setResult] = useState<RunResult | null>(null);
  const [count, setCount] = useState("1");
  const [userId, setUserId] = useState("user-0001");
  const [forceVariant, setForceVariant] = useState<"control" | "challenger">("control");

  async function run() {
    setStatus("loading");
    setResult(null);
    const params: TriggerParams = { count: Number(count) || 1 };
    if (scenario.params.includes("userId")) params.userId = userId;
    if (scenario.params.includes("forceVariant")) params.forceVariant = forceVariant;

    try {
      const res = await fetch("/api/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: scenario.key, params }),
      });
      const data = (await res.json()) as RunResult;
      setResult(data);
      setStatus(data.ok ? "success" : "idle");
      if (data.ok) setTimeout(() => setStatus("idle"), 1200);
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : "Request failed" });
      setStatus("idle");
    }
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      style={{ padding: "12px 0", borderTop: "1px solid var(--gray-a4)" }}
    >
      <Flex direction="column" gap="2">
        <Flex justify="between" align="center" gap="3" wrap="wrap">
          <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
            <Text weight="medium">{scenario.label}</Text>
            <Text size="1" color="gray">{scenario.description}</Text>
          </Flex>
          <Flex align="center" gap="2">
            {scenario.params.includes("userId") && (
              <TextField.Root
                size="1"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                style={{ width: 110 }}
                aria-label="User ID"
              />
            )}
            {scenario.params.includes("forceVariant") && (
              <Select.Root value={forceVariant} onValueChange={(v) => setForceVariant(v as "control" | "challenger")}>
                <Select.Trigger />
                <Select.Content>
                  <Select.Item value="control">control</Select.Item>
                  <Select.Item value="challenger">challenger</Select.Item>
                </Select.Content>
              </Select.Root>
            )}
            <TextField.Root
              size="1"
              type="number"
              min="1"
              max="100"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              style={{ width: 64 }}
              aria-label="Event count"
            />
            <RunButton status={status} onRun={run} />
          </Flex>
        </Flex>
        <ResultCallout result={result} />
      </Flex>
    </motion.div>
  );
}
```

- [ ] **Step 7: Write the scenario card**

`components/scenario-card.tsx`:

```tsx
import { Card, Heading } from "@radix-ui/themes";

import { ScenarioRow } from "./scenario-row";
import type { Scenario } from "@/lib/scenarios";

export function ScenarioCard({ title, scenarios }: { title: string; scenarios: Scenario[] }) {
  return (
    <Card size="3">
      <Heading size="4" mb="2">{title}</Heading>
      {scenarios.map((s) => (
        <ScenarioRow key={s.key} scenario={s} />
      ))}
    </Card>
  );
}
```

- [ ] **Step 8: Write `app/layout.tsx`**

```tsx
import "@radix-ui/themes/styles.css";
import "./globals.css";

import type { Metadata } from "next";

import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Scoring & Experiments Demo",
  description: "Trigger Inngest runs exercising scoring and experiments.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 9: Write `app/page.tsx`**

```tsx
import { Box, Container, Flex, Grid, Heading, Text } from "@radix-ui/themes";

import { ScenarioCard } from "@/components/scenario-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { scenarios } from "@/lib/scenarios";

export default function Home() {
  const scoring = scenarios.filter((s) => s.group === "scoring");
  const experiments = scenarios.filter((s) => s.group === "experiments");

  return (
    <Container size="3" p="5">
      <Flex justify="between" align="center" mb="5">
        <Box>
          <Heading size="6">Scoring &amp; Experiments</Heading>
          <Text size="2" color="gray">Fire events that trigger Inngest runs, then inspect them in the dashboard.</Text>
        </Box>
        <ThemeToggle />
      </Flex>
      <Grid columns={{ initial: "1", md: "2" }} gap="4">
        <ScenarioCard title="Scoring primitives" scenarios={scoring} />
        <ScenarioCard title="Experiments" scenarios={experiments} />
      </Grid>
    </Container>
  );
}
```

- [ ] **Step 10: Typecheck, lint, and build**

Run: `pnpm typecheck && pnpm lint && pnpm build`
Expected: all PASS. If `pnpm lint` prompts to configure ESLint on first run, accept the strict default (eslint-config-next is already a dep).

- [ ] **Step 11: Commit**

```bash
git add app/ components/
git commit -m "feat: build radix-themes UI with motion micro-interactions"
```

---

### Task 6: Env example, README, and manual end-to-end verification

**Files:**
- Create: `projects/scoring-and-experiments/.env.example`
- Create: `projects/scoring-and-experiments/README.md`

- [ ] **Step 1: Write `.env.example`**

```
# Local dev needs NO keys — the SDK targets the dev server at http://localhost:8288.
# Set these only for Inngest Cloud (e.g. on Vercel):
# INNGEST_SIGNING_KEY=signkey-prod-...
# INNGEST_EVENT_KEY=...

# Optional: override the dashboard base URL used for "view run" links.
# DASHBOARD_URL=http://localhost:8288
```

- [ ] **Step 2: Write `README.md`**

````markdown
# Scoring & Experiments Demo

A minimal Next.js app that fires events triggering Inngest runs which exercise
every scoring primitive and every experiment strategy from inngest-js PR #1521
(`inngest@4.4.1-pr-1521.15`).

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

The dev server auto-discovers the app at `http://localhost:3000/api/inngest`.

## Scenarios

**Scoring primitives**
- `step.score()` step-scoped — durable score on a step (numeric + boolean)
- `step.score()` run-scoped — durable score on the run
- `inngest.score()` — live API writes inside `step.run()`
- `createScorer()` — companion scorer that scores the parent run

**Experiments** (each variant emits accuracy + latency scores)
- `experiment.weighted()`, `experiment.fixed()`, `experiment.bucket()`, `experiment.custom()`

## Deploy to Vercel

1. Push this directory to a git repo and import it into Vercel.
2. Set `INNGEST_SIGNING_KEY` and `INNGEST_EVENT_KEY` (from Inngest Cloud) as env vars.
   With these present the SDK targets Inngest Cloud automatically.
3. Register the app's `/api/inngest` URL in the Inngest Cloud dashboard.
4. **Password protection:** enable it in Vercel → Project → Settings → Deployment
   Protection → Password Protection (a paid Vercel feature). No app-level auth is
   implemented by design.
````

- [ ] **Step 3: Manual end-to-end verification**

Run, from `projects/scoring-and-experiments/`:

```bash
npx inngest-cli@latest dev    # terminal 1
pnpm dev                      # terminal 2
```

Then in the browser at http://localhost:3000:
1. Confirm light/dark toggle works and animates.
2. Fire each of the 8 scenarios (try count > 1, and the bucket/custom params).
3. For each, follow "View in dashboard" and confirm in http://localhost:8288:
   - Scoring runs show their score(s) with the expected names/values/scope.
   - `score-with-scorer` produces a follow-up scorer run that writes `accuracy-rate`
     scoped to the parent.
   - Experiment runs show variant attribution plus per-variant `accuracy-rate` and
     `latency-p95-ms` scores.

Expected: every scenario fires without error and produces the described runs/scores.

- [ ] **Step 4: Commit**

```bash
git add .env.example README.md
git commit -m "docs: add env example and README with run/deploy instructions"
```

---

## Self-Review notes

- **Spec coverage:** all 8 functions (4 scoring primitives + 4 experiment strategies),
  env-driven connection, trigger-only UI + dashboard link, Radix Themes light/dark,
  Motion micro-interactions, npm prerelease SDK, no app-level auth (Vercel), pnpm,
  correct project location — each maps to a task above.
- **Known risk:** the exact `motion`, `@radix-ui/themes`, and `inngest/experimental`
  type/export shapes are pinned to the versions in `package.json`; if a symbol
  (e.g. `experiment`, `createScorer`, `defer` on ctx) doesn't resolve, verify against
  the local `inngest-js` source on the PR branch before substituting.
- **Verification deviation:** typecheck/lint/build per task + a final manual E2E,
  in place of an automated suite, as authorized by the spec.
```