import type { AIRequest, AIResponse } from "./provider";
import { getProvider } from "./getProvider";
import { safeFallback } from "./schema";

// Timeout máximo para la llamada al proveedor de IA. Si se vence, caemos al
// fallback seguro para no dejar el chat colgado.
const TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("AI provider timeout")), ms)
    ),
  ]);
}

// Punto de entrada del motor de IA. Cualquier falla (error del proveedor,
// timeout, salida que no valida contra el schema) cae al fallback seguro, que
// siempre marca para revisión humana. Nunca lanza.
export async function generarRespuestaIA(input: AIRequest): Promise<AIResponse> {
  try {
    const provider = getProvider();
    return await withTimeout(provider.generateResponse(input), TIMEOUT_MS);
  } catch (e) {
    console.error("[AI engine] fallback por error:", e);
    return safeFallback(
      "El asistente no pudo procesar el mensaje automáticamente (error o timeout del proveedor)."
    );
  }
}
