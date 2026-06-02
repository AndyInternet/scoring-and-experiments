import { createScorer } from "inngest/experimental";

import { inngest } from "./client";

/**
 * Every scoring primitive from PR #1521, one function per pattern. Trigger any
 * of these from the UI, then inspect the run + its score(s) in the dashboard.
 */

// 1. step.score() with a stepId => durable, STEP-scoped score. The recommended
//    pattern. Emits one numeric and one boolean score.
//
//    Note the stepId equals the score's own memoization id (first arg). step.score
//    wraps the write in a durable step; when stepId matches that step's id, the SDK
//    routes the score through the batch path (see targetsCurrentStep in the SDK's
//    InngestMetadata.ts) so it rides out on the same opcode as the score step — no
//    extra round-trip. The stepId targets the score step itself; it does NOT need to
//    reference another step.run() step.
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
      // step-scoped live write: stepId targets the enclosing step.run id
      // ("score-step-live"), so the score attaches to that step.
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
