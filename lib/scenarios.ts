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

export type Transport = "http" | "connect";

export type TriggerParams = {
  count?: number;
  userId?: string;
  forceVariant?: "control" | "challenger";
  // Which app to trigger: the HTTP/serve app or the connect-worker app. The
  // trigger route prefixes the event with "connect/" for the connect app.
  transport?: Transport;
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
