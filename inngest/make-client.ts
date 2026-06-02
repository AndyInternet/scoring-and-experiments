import { Inngest } from "inngest";
import { scoreMiddleware } from "inngest/experimental";

/**
 * Builds an Inngest client configured with scoreMiddleware() (which gates and
 * types `step.score()`). Both apps — the HTTP/serve client and the connect-worker
 * client — are created here so they share an identical type; `ScoringClient` is
 * what the function factories accept.
 */
export function makeClient(id: string, appVersion?: string) {
  return new Inngest({ id, appVersion, middleware: [scoreMiddleware()] });
}

export type ScoringClient = ReturnType<typeof makeClient>;
