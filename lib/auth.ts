// Minimal password gate (low-security, as intended). The auth cookie holds a
// SHA-256 token derived from APP_PASSWORD rather than the raw password. Both the
// middleware (edge runtime) and the login route can recompute it, so no session
// store is needed. Uses only Web Crypto + TextEncoder, which exist in both the
// edge runtime and Node 18+.

export const AUTH_COOKIE = "app_auth";

export async function authToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`scoring-and-experiments:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
