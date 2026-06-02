import { makeClient } from "./make-client";

// The HTTP/serve app client. No keys => SDK targets the local dev server. With
// INNGEST_SIGNING_KEY / INNGEST_EVENT_KEY set (e.g. on Vercel) it targets Inngest
// Cloud automatically. scoreMiddleware() (added in makeClient) gates step.score().
export const inngest = makeClient("scoring-and-experiments-demo");
