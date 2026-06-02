// Resolves the base URL of the Inngest dashboard for "view run" links.
// DASHBOARD_URL overrides; otherwise cloud when a signing key is present, else dev.
export function dashboardBaseUrl(): string {
  if (process.env.DASHBOARD_URL) return process.env.DASHBOARD_URL;
  if (process.env.INNGEST_SIGNING_KEY) return "https://app.inngest.com";
  return "http://localhost:8288";
}
