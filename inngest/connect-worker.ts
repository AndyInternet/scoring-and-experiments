import { connect } from "inngest/connect";
import { WebSocket as NodeWebSocket } from "ws";

import { connectInngest } from "./connect-client";
import { buildFunctions } from "./functions";

// Node < 22 has no global WebSocket, which the connect SDK requires. Polyfill it
// from `ws`. We also run the connection on the main thread (isolateExecution:
// false below) so this polyfill is visible — worker threads get their own global
// scope. On Node 22+ the global already exists and this is a no-op.
const g = globalThis as { WebSocket?: unknown };
if (typeof g.WebSocket === "undefined") {
  g.WebSocket = NodeWebSocket;
}

// Standalone worker process. Connects the second app to the Inngest dev server (or
// Cloud) over a persistent WebSocket — no public HTTP endpoint needed. Run it with
// `pnpm connect`, which sets INNGEST_DEV=1 so it targets the local dev server's
// connect gateway. Functions trigger on "connect/"-prefixed events.
const functions = buildFunctions(connectInngest, "connect/");

console.log(
  `Connecting ${functions.length} functions as "${connectInngest.id}"...`,
);

connect({
  apps: [{ client: connectInngest, functions }],
  instanceId: "scoring-connect-worker",
  // Run the connection on the main thread so the WebSocket polyfill above applies.
  isolateExecution: false,
})
  .then(async (conn) => {
    console.log("Connected:", conn.state);
    await conn.closed;
    console.log("Connection closed.");
  })
  .catch((err) => {
    console.error("Connect worker failed:", err);
    process.exit(1);
  });
