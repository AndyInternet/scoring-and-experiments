import { inngest } from "@/inngest";

// Builds a link to the Inngest dashboard runs page for a given function.
//
// - Dev server: a single global runs feed at `/runs`.
// - Cloud: the per-function runs page at
//   `/env/<env>/functions/<appId>-<functionId>/runs`.
//
// DASHBOARD_URL overrides the base URL; INNGEST_ENV overrides the cloud env slug
// (defaults to "production").
function baseUrl(): string {
  if (process.env.DASHBOARD_URL) return process.env.DASHBOARD_URL;
  return process.env.INNGEST_SIGNING_KEY
    ? "https://app.inngest.com"
    : "http://localhost:8288";
}

export function dashboardRunsUrl(functionId: string): string {
  const base = baseUrl();
  if (base.includes("app.inngest.com")) {
    const env = process.env.INNGEST_ENV ?? "production";
    // Cloud function slug is `<appId>-<functionId>`.
    return `${base}/env/${env}/functions/${inngest.id}-${functionId}/runs`;
  }
  return `${base}/runs`;
}
