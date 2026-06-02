import type { InngestFunction } from "inngest";

import { inngest } from "./client";
import * as experiments from "./experiments";
import * as scoring from "./scoring";

export const functions = [
  ...Object.values(scoring),
  ...Object.values(experiments),
] as InngestFunction.Any[];

export { inngest };
