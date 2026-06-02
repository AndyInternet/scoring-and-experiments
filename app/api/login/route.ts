import { NextResponse } from "next/server";

import { AUTH_COOKIE, authToken } from "@/lib/auth";

export async function POST(req: Request) {
  const password = process.env.APP_PASSWORD;
  // Auth disabled (no password configured) — nothing to check.
  if (!password) return NextResponse.json({ ok: true });

  let submitted: unknown;
  try {
    ({ password: submitted } = await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  if (submitted !== password) {
    return NextResponse.json({ ok: false, error: "Incorrect password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, await authToken(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return res;
}
