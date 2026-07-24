import { NextResponse } from "next/server";

// ⚠️ TEMPORAL (Tarea 6): candado simple por token compartido para las rutas de
// operador. NO es un sistema de login: solo distingue "tiene el token" de "no
// lo tiene". Se reemplaza por sesiones de usuario reales en la Tarea 7.

// Extrae el token de la request: acepta "Authorization: Bearer <token>" o el
// header custom "x-operator-token".
function extractToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth && auth.startsWith("Bearer ")) {
    return auth.slice("Bearer ".length).trim() || null;
  }
  const custom = request.headers.get("x-operator-token");
  return custom?.trim() || null;
}

// Devuelve una respuesta 401 si la request no está autorizada, o null si sí lo
// está. Falla cerrado: si OPERATOR_TOKEN no está configurado, deniega.
export function requireOperator(request: Request): NextResponse | null {
  const expected = process.env.OPERATOR_TOKEN;
  const provided = extractToken(request);

  if (!expected || !provided || provided !== expected) {
    return NextResponse.json(
      { error: "No autorizado. Se requiere el token de operador." },
      { status: 401 }
    );
  }
  return null;
}
