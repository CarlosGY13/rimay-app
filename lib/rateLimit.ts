import { NextResponse } from "next/server";

// Rate limiting básico en memoria (ventana deslizante por clave/IP). Suficiente
// para esta etapa: evita que alguien sature el chat público o gaste crédito de
// la API de IA de forma abusiva. No sobrevive a reinicios ni escala a varias
// instancias — eso sería una tarea futura de robustez de infraestructura.

const WINDOW_MS = 15_000;
const MAX_REQUESTS = 10;

const hits = new Map<string, number[]>();

// Identifica al cliente por IP (x-forwarded-for / x-real-ip). Si no hay, cae a
// una clave genérica (mejor limitar de más que no limitar).
export function clientKey(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

// Registra un hit y devuelve true si está permitido, false si excede el límite.
export function rateLimit(
  key: string,
  max: number = MAX_REQUESTS,
  windowMs: number = WINDOW_MS
): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }

  recent.push(now);
  hits.set(key, recent);

  // Prune ocasional para que el Map no crezca sin límite.
  if (hits.size > 5000) {
    for (const [k, arr] of hits) {
      const alive = arr.filter((t) => now - t < windowMs);
      if (alive.length === 0) hits.delete(k);
      else hits.set(k, alive);
    }
  }

  return true;
}

// Helper: aplica el límite y devuelve una respuesta 429 si se excede, o null.
export function enforceRateLimit(request: Request): NextResponse | null {
  const allowed = rateLimit(clientKey(request));
  if (!allowed) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes, esperá unos segundos e intentá de nuevo." },
      { status: 429 }
    );
  }
  return null;
}
