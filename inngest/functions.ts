import type { InngestFunction } from "inngest";

import { createExperimentFunctions } from "./experiments";
import type { ScoringClient } from "./make-client";
import { createScoringFunctions } from "./scoring";

/**
 * Builds the full set of 8 functions (+ the scorer companion) for a given client.
 * Used by both apps: the HTTP/serve app (eventPrefix "") and the connect-worker
 * app (eventPrefix "connect/").
 */
export function buildFunctions(
  client: ScoringClient,
  eventPrefix = "",
): InngestFunction.Any[] {
  return [
    ...createScoringFunctions(client, eventPrefix),
    ...createExperimentFunctions(client, eventPrefix),
  ];
}
