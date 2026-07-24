import { SignJWT, jwtVerify } from "jose";

// ============================================================
// Sesión: JWT firmado guardado en una cookie httpOnly.
//
// Elegimos JWT con `jose` (en vez de NextAuth) porque:
//  - Es liviano y sin dependencias de adaptador/DB de sesiones.
//  - `jose` funciona tanto en el runtime Node (route handlers) como en el
//    Edge (middleware), así que podemos proteger páginas en el middleware
//    y validar en las rutas API con el mismo mecanismo.
//  - El alcance de esta tarea es simple (un usuario/tenant), no justifica
//    el peso de NextAuth.
//
// Este módulo es Edge-safe: NO importa next/headers, así que puede usarse
// desde el middleware. La lectura de la cookie del lado servidor vive en
// lib/auth/session.ts.
// ============================================================

export const SESSION_COOKIE = "rimay_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 días (segundos)

const ALG = "HS256";

export type Session = {
  userId: string;
  tenantId: string;
};

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET no está configurada (o es demasiado corta). Definila en el entorno."
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(session: Session): Promise<string> {
  return new SignJWT({ userId: session.userId, tenantId: session.tenantId })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string
): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (
      typeof payload.userId === "string" &&
      typeof payload.tenantId === "string"
    ) {
      return { userId: payload.userId, tenantId: payload.tenantId };
    }
    return null;
  } catch {
    return null;
  }
}
