import type { AIResponse } from "./provider";

// ============================================================
// Salida estructurada del motor de IA
//
// El modelo DEBE devolver exactamente esta forma. Cada adaptador usa el
// mecanismo de salida estructurada de su proveedor (json_schema en OpenAI,
// responseSchema en Gemini) para forzarla, en vez de pedir "responde en JSON"
// en texto plano (mucho menos confiable).
// ============================================================

export type StructuredResponse = {
  reply: string;
  needsHumanReview: boolean;
  reviewReason: string | null;
};

// JSON Schema para OpenAI (structured outputs, modo strict: todas las
// propiedades requeridas y additionalProperties: false).
export const OPENAI_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    reply: {
      type: "string",
      description: "El texto que se le muestra al cliente.",
    },
    needsHumanReview: {
      type: "boolean",
      description: "true si la consulta debe escalar a un humano.",
    },
    reviewReason: {
      type: ["string", "null"],
      description:
        "Motivo de la escalada, solo si needsHumanReview es true; null en caso contrario.",
    },
  },
  required: ["reply", "needsHumanReview", "reviewReason"],
  additionalProperties: false,
};

// Respuesta segura por defecto cuando el proveedor falla, se vence el timeout,
// o la salida no valida contra el schema. Siempre escala a revisión humana.
export function safeFallback(reason: string): AIResponse {
  return {
    text: "Dame un momento, ya te ayudo.",
    needsHumanReview: true,
    reviewReason: reason,
  };
}

// Parsea y valida la salida cruda del modelo contra el schema esperado.
// Lanza si no matchea (el motor lo convierte en fallback seguro).
export function parseStructuredResponse(raw: string): StructuredResponse {
  const obj = JSON.parse(raw) as Record<string, unknown>;

  if (typeof obj.reply !== "string" || obj.reply.trim().length === 0) {
    throw new Error("Salida inválida: 'reply' ausente o vacío.");
  }
  if (typeof obj.needsHumanReview !== "boolean") {
    throw new Error("Salida inválida: 'needsHumanReview' no es booleano.");
  }

  const reviewReason =
    typeof obj.reviewReason === "string" && obj.reviewReason.trim().length > 0
      ? obj.reviewReason
      : null;

  return {
    reply: obj.reply,
    needsHumanReview: obj.needsHumanReview,
    reviewReason,
  };
}
