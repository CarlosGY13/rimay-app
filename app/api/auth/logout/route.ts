import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/token";

export const dynamic = "force-dynamic";

// Invalida la sesión borrando la cookie.
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 0,
  });
  return res;
}
