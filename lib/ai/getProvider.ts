import type { AIProvider } from "./provider";
import { OpenAIProvider } from "./providers/openai";
import { GeminiProvider } from "./providers/gemini";

const SUPPORTED = ["openai", "gemini"] as const;
type SupportedProvider = (typeof SUPPORTED)[number];

// Devuelve el adaptador de IA según la variable de entorno AI_PROVIDER.
//
// Si AI_PROVIDER falta o no coincide con un proveedor soportado, falla de
// forma clara y explícita (no en silencio a mitad de una conversación).
//
// TODO(Tarea 7+): cuando exista selección de proveedor por tenant, esta
// función debería recibir el Tenant y leer su proveedor configurado en la
// DB, cayendo a AI_PROVIDER como default global. Hoy hay un único tenant
// fijo, así que agregar ese campo ahora sería adelantarse sin necesidad real.
export function getProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER;

  switch (provider) {
    case "openai":
      return new OpenAIProvider();
    case "gemini":
      return new GeminiProvider();
    default:
      throw new Error(
        `AI_PROVIDER inválido o ausente: "${provider ?? ""}". ` +
          `Valores soportados: ${SUPPORTED.map((p) => `"${p}"`).join(", ")}.`
      );
  }
}

export type { SupportedProvider };
