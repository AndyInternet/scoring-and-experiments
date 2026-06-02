import { inngest } from "./client";
import { buildFunctions } from "./functions";

// The HTTP/serve app: functions trigger on the bare event names (no prefix).
export const functions = buildFunctions(inngest);

export { inngest };
