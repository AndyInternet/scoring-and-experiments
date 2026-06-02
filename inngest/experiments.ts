import { experiment, type InngestFunction } from "inngest";

import type { ScoringClient } from "./make-client";

/**
 * The four experiment strategies, built as a factory so they can be bound to
 * either app (HTTP/serve client or connect-worker client). Each strategy runs two
 * variants; every variant emits an `accuracy-rate` (boolean) and a
 * `latency-p95-ms` (numeric) score.
 *
 * `eventPrefix` namespaces the trigger events per app (e.g. "" for HTTP,
 * "connect/" for the connect app).
 */
export function createExperimentFunctions(
  client: ScoringClient,
  eventPrefix = "",
): InngestFunction.Any[] {
  // ----- 1. experiment.weighted — 50/50 random selection, seeded by runId.
  const weightedExperiment = client.createFunction(
    {
      id: "exp-weighted",
      retries: 0,
      triggers: { event: `${eventPrefix}experiments/weighted.run` },
    },
    async ({ event, group, step }) => {
      const { expected } = event.data as { expected: string };

      return group.experiment("weighted-checkout-flow", {
        variants: {
          control: async () => {
            const response = await step.run("control-response", () => ({
              answer: Math.random() < 0.8 ? expected : "wrong",
              latencyMs: 180 + Math.round((Math.random() - 0.5) * 60),
            }));

            await step.score("control-accuracy", {
              stepId: "control-accuracy",
              name: "accuracy-rate",
              value: response.answer === expected,
            });
            await step.score("control-latency", {
              stepId: "control-latency",
              name: "latency-p95-ms",
              value: Math.max(0, (500 - response.latencyMs) / 500),
            });

            return response;
          },

          challenger: async () => {
            const response = await step.run("challenger-response", () => ({
              answer: Math.random() < 0.92 ? expected : "wrong",
              latencyMs: 250 + Math.round((Math.random() - 0.5) * 60),
            }));

            await step.score("challenger-accuracy", {
              stepId: "challenger-accuracy",
              name: "accuracy-rate",
              value: response.answer === expected,
            });
            await step.score("challenger-latency", {
              stepId: "challenger-latency",
              name: "latency-p95-ms",
              value: Math.max(0, (500 - response.latencyMs) / 500),
            });

            return response;
          },
        },
        select: experiment.weighted({ control: 50, challenger: 50 }),
      });
    },
  );

  // ----- 2. experiment.fixed — always picks the named variant.
  const fixedExperiment = client.createFunction(
    {
      id: "exp-fixed",
      retries: 0,
      triggers: { event: `${eventPrefix}experiments/fixed.run` },
    },
    async ({ event, group, step }) => {
      const { expected } = event.data as { expected: string };

      return group.experiment("fixed-prompt-rev", {
        variants: {
          control: async () => {
            const response = await step.run("control-response", () => ({
              answer: Math.random() < 0.8 ? expected : "wrong",
              latencyMs: 180 + Math.round((Math.random() - 0.5) * 60),
            }));

            await step.score("control-accuracy", {
              stepId: "control-accuracy",
              name: "accuracy-rate",
              value: response.answer === expected,
            });
            await step.score("control-latency", {
              stepId: "control-latency",
              name: "latency-p95-ms",
              value: Math.max(0, (500 - response.latencyMs) / 500),
            });

            return response;
          },

          challenger: async () => {
            const response = await step.run("challenger-response", () => ({
              answer: Math.random() < 0.92 ? expected : "wrong",
              latencyMs: 250 + Math.round((Math.random() - 0.5) * 60),
            }));

            await step.score("challenger-accuracy", {
              stepId: "challenger-accuracy",
              name: "accuracy-rate",
              value: response.answer === expected,
            });
            await step.score("challenger-latency", {
              stepId: "challenger-latency",
              name: "latency-p95-ms",
              value: Math.max(0, (500 - response.latencyMs) / 500),
            });

            return response;
          },
        },
        select: experiment.fixed("control"),
      });
    },
  );

  // ----- 3. experiment.bucket — consistent hash of userId into a variant.
  const bucketExperiment = client.createFunction(
    {
      id: "exp-bucket",
      retries: 0,
      triggers: { event: `${eventPrefix}experiments/bucket.run` },
    },
    async ({ event, group, step }) => {
      const { userId, expected } = event.data as {
        userId: string;
        expected: string;
      };

      return group.experiment("bucket-user-cohort", {
        variants: {
          a: async () => {
            const response = await step.run("a-response", () => ({
              answer: Math.random() < 0.7 ? expected : "wrong",
              latencyMs: 150 + Math.round((Math.random() - 0.5) * 60),
            }));

            await step.score("a-accuracy", {
              stepId: "a-accuracy",
              name: "accuracy-rate",
              value: response.answer === expected,
            });
            await step.score("a-latency", {
              stepId: "a-latency",
              name: "latency-p95-ms",
              value: Math.max(0, (500 - response.latencyMs) / 500),
            });

            return response;
          },

          b: async () => {
            const response = await step.run("b-response", () => ({
              answer: Math.random() < 0.95 ? expected : "wrong",
              latencyMs: 300 + Math.round((Math.random() - 0.5) * 60),
            }));

            await step.score("b-accuracy", {
              stepId: "b-accuracy",
              name: "accuracy-rate",
              value: response.answer === expected,
            });
            await step.score("b-latency", {
              stepId: "b-latency",
              name: "latency-p95-ms",
              value: Math.max(0, (500 - response.latencyMs) / 500),
            });

            return response;
          },
        },
        select: experiment.bucket(userId, { weights: { a: 70, b: 30 } }),
      });
    },
  );

  // ----- 4. experiment.custom — user-supplied selection function.
  const customExperiment = client.createFunction(
    {
      id: "exp-custom",
      retries: 0,
      triggers: { event: `${eventPrefix}experiments/custom.run` },
    },
    async ({ event, group, step }) => {
      const { expected, forceVariant } = event.data as {
        expected: string;
        forceVariant?: "control" | "challenger";
      };

      return group.experiment("custom-feature-flag", {
        variants: {
          control: async () => {
            const response = await step.run("control-response", () => ({
              answer: Math.random() < 0.8 ? expected : "wrong",
              latencyMs: 180 + Math.round((Math.random() - 0.5) * 60),
            }));

            await step.score("control-accuracy", {
              stepId: "control-accuracy",
              name: "accuracy-rate",
              value: response.answer === expected,
            });
            await step.score("control-latency", {
              stepId: "control-latency",
              name: "latency-p95-ms",
              value: Math.max(0, (500 - response.latencyMs) / 500),
            });

            return response;
          },

          challenger: async () => {
            const response = await step.run("challenger-response", () => ({
              answer: Math.random() < 0.92 ? expected : "wrong",
              latencyMs: 250 + Math.round((Math.random() - 0.5) * 60),
            }));

            await step.score("challenger-accuracy", {
              stepId: "challenger-accuracy",
              name: "accuracy-rate",
              value: response.answer === expected,
            });
            await step.score("challenger-latency", {
              stepId: "challenger-latency",
              name: "latency-p95-ms",
              value: Math.max(0, (500 - response.latencyMs) / 500),
            });

            return response;
          },
        },
        select: experiment.custom(() => forceVariant ?? "control"),
      });
    },
  );

  return [
    weightedExperiment,
    fixedExperiment,
    bucketExperiment,
    customExperiment,
  ] as InngestFunction.Any[];
}
