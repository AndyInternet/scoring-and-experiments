import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { AUTH_COOKIE, authToken } from "@/lib/auth";

// Password gate. Enabled only when APP_PASSWORD is set (so local dev stays open).
// `/api/inngest` is always open — Inngest Cloud must reach it to sync and execute.
// The login page and its API are open so an unauthenticated user can sign in.
export async function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith("/api/inngest") ||
    pathname === "/login" ||
    pathname === "/api/login"
  ) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(AUTH_COOKIE)?.value;
  if (cookie && cookie === (await authToken(password))) {
    return NextResponse.next();
  }

  // API calls get a 401; page navigations are redirected to the login screen.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
