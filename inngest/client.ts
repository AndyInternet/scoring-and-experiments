import { Inngest } from "inngest";
import { scoreMiddleware } from "inngest/experimental";

// scoreMiddleware() gates step.score(); without it the tool throws at call time.
// No keys => SDK targets the local dev server. With INNGEST_SIGNING_KEY /
// INNGEST_EVENT_KEY set (e.g. on Vercel) it targets Inngest Cloud automatically.
export const inngest = new Inngest({
  id: "scoring-and-experiments-demo",
  middleware: [scoreMiddleware()],
});
