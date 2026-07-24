import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken, type Session } from "./token";

// Lee y valida la sesión desde la cookie (para usar en route handlers).
export async function getSession(): Promise<Session | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

// Helper para rutas API: devuelve la sesión, o una respuesta 401 si no hay.
// Uso: const { session, response } = await requireSession(); if (response) return response;
export async function requireSession(): Promise<
  { session: Session; response: null } | { session: null; response: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return {
      session: null,
      response: NextResponse.json(
        { error: "No autorizado. Iniciá sesión." },
        { status: 401 }
      ),
    };
  }
  return { session, response: null };
}

export type { Session };
