import { makeClient } from "./make-client";

// The second app: the same 8 functions, but served over the connect() WebSocket
// protocol (see connect-worker.ts) instead of the HTTP /api/inngest endpoint. It's
// a distinct app id, so it appears separately in the dashboard. appVersion is
// recommended for connect workers so the gateway can track deploys.
export const connectInngest = makeClient(
  "scoring-and-experiments-connect-demo",
  "v1",
);
