// ============================================================
// Conversation Insights — prompts, schemas y parsers
//
// Dos funciones de IA:
// 1. Extracción: analiza los mensajes de una conversación cerrada y
//    produce un resumen de fricción (summary, tags, hadFriction).
// 2. Agregación: recibe los últimos N insights y genera clusters
//    temáticos con reglas de negocio sugeridas.
// ============================================================

// ---- Tipos ----

export type InsightExtractionInput = {
  messages: { role: "cliente" | "agente" | "operador"; content: string }[];
  businessName: string;
  rubro: string;
};

export type InsightExtractionOutput = {
  summary: string;
  tags: string[];
  hadFriction: boolean;
};

export type AggregationTheme = {
  theme: string;
  count: number;
  description: string;
  suggestedRule: string;
};

export type AggregationInput = {
  insights: { summary: string; tags: string[] }[];
  existingRules: string[];
  businessName: string;
  rubro: string;
};

export type AggregationOutput = {
  themes: AggregationTheme[];
};

// ---- Prompts ----

export function buildInsightExtractionPrompt(input: InsightExtractionInput): string {
  const mensajes = input.messages
    .map((m) => `[${m.role}]: ${m.content}`)
    .join("\n");

  return [
    `Eres un analista de calidad de servicio para "${input.businessName}" (rubro: ${input.rubro}).`,
    "Se te presenta la transcripción completa de una conversación con un cliente que ya terminó.",
    "",
    "Tu tarea: analizar la conversación y determinar si el cliente experimentó alguna fricción o problema.",
    "",
    "Fricción incluye (pero no se limita a):",
    "- El cliente pidió algo que no estaba en el catálogo",
    "- El cliente se confundió sobre políticas, horarios, o precios",
    "- El cliente se quejó o expresó frustración",
    "- El cliente tuvo que repetir su pedido o aclarar varias veces",
    "- El agente no pudo resolver la consulta sin ayuda humana",
    "- El cliente preguntó sobre delivery, zonas, o métodos de pago y no había regla clara",
    "",
    "Reglas:",
    "- Basá tu análisis SOLO en lo que dice la conversación. No inventes ni asumas.",
    "- El summary debe ser 1-2 oraciones concisas describiendo el resultado.",
    "- Los tags deben ser etiquetas cortas en español (ej: 'item_no_disponible', 'confusion_delivery', 'queja', 'demora').",
    "- Si la conversación fue fluida y sin problemas, poné hadFriction = false, un summary breve y tags vacío.",
    "",
    "== CONVERSACIÓN ==",
    mensajes,
    "",
    "Devolvé tu análisis en el formato estructurado indicado.",
  ].join("\n");
}

export function buildInsightAggregationPrompt(input: AggregationInput): string {
  const insightList = input.insights
    .map((ins, i) => `${i + 1}. ${ins.summary} [tags: ${ins.tags.join(", ")}]`)
    .join("\n");

  const reglasExistentes =
    input.existingRules.length > 0
      ? input.existingRules.map((r) => `- ${r}`).join("\n")
      : "(sin reglas existentes)";

  return [
    `Eres un analista de patrones de atención al cliente para "${input.businessName}" (rubro: ${input.rubro}).`,
    "Se te presenta una lista de insights extraídos de conversaciones recientes con clientes.",
    "",
    "Tu tarea: agrupar los insights en temas recurrentes y sugerir reglas de negocio que prevendrían estos problemas.",
    "",
    "Instrucciones:",
    "- Agrupa insights similares en máximo 5 temas.",
    "- Ordena los temas por frecuencia (más común primero).",
    "- Para cada tema, genera una regla de negocio concreta y accionable en español que el dueño del negocio pueda agregar a su configuración.",
    "- La regla sugerida debe ser clara, breve (1 oración) y resolver el problema que causa la fricción.",
    "- NO sugiereas reglas que ya existen (ver lista de reglas actuales abajo).",
    "- Si un insight es único (no se repite), igualmente inclúelo como tema con count=1 si es relevante.",
    "- count = cuántos de los insights listados corresponden a ese tema.",
    "",
    "== INSIGHTS RECIENTES ==",
    insightList,
    "",
    "== REGLAS DE NEGOCIO EXISTENTES (no duplicar) ==",
    reglasExistentes,
    "",
    "Devolvé tu análisis en el formato estructurado indicado.",
  ].join("\n");
}

// ---- JSON Schemas (OpenAI strict mode) ----

export const OPENAI_INSIGHT_EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: "Resumen de 1-2 oraciones sobre el resultado de la conversación y cualquier fricción.",
    },
    tags: {
      type: "array",
      items: { type: "string" },
      description: "Etiquetas cortas que clasifican el tipo de fricción (ej: 'item_no_disponible').",
    },
    hadFriction: {
      type: "boolean",
      description: "true si el cliente experimentó alguna fricción o problema durante la conversación.",
    },
  },
  required: ["summary", "tags", "hadFriction"],
  additionalProperties: false,
};

export const OPENAI_INSIGHT_AGGREGATION_SCHEMA = {
  type: "object",
  properties: {
    themes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          theme: {
            type: "string",
            description: "Nombre breve del tema recurrente.",
          },
          count: {
            type: "number",
            description: "Cuántos insights corresponden a este tema.",
          },
          description: {
            type: "string",
            description: "Explicación breve del patrón observado.",
          },
          suggestedRule: {
            type: "string",
            description: "Regla de negocio sugerida para prevenir esta fricción.",
          },
        },
        required: ["theme", "count", "description", "suggestedRule"],
        additionalProperties: false,
      },
    },
  },
  required: ["themes"],
  additionalProperties: false,
};

// ---- Parsers ----

export function parseInsightOutput(raw: string): InsightExtractionOutput {
  const obj = JSON.parse(raw) as Record<string, unknown>;

  if (typeof obj.summary !== "string" || obj.summary.trim().length === 0) {
    throw new Error("Insight inválido: 'summary' ausente o vacío.");
  }
  if (obj.summary.length > 500) {
    // Truncar en vez de rechazar para ser resilientes
    obj.summary = (obj.summary as string).slice(0, 500);
  }

  if (!Array.isArray(obj.tags)) {
    throw new Error("Insight inválido: 'tags' no es un array.");
  }
  // Filtrar tags inválidos y limitar a 10
  const tags = (obj.tags as unknown[])
    .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
    .map((t) => t.trim().toLowerCase())
    .slice(0, 10);

  if (typeof obj.hadFriction !== "boolean") {
    throw new Error("Insight inválido: 'hadFriction' no es booleano.");
  }

  return {
    summary: (obj.summary as string).trim(),
    tags,
    hadFriction: obj.hadFriction,
  };
}

export function parseAggregationOutput(raw: string): AggregationOutput {
  const obj = JSON.parse(raw) as Record<string, unknown>;

  if (!Array.isArray(obj.themes)) {
    throw new Error("Agregación inválida: 'themes' no es un array.");
  }

  const themes: AggregationTheme[] = [];

  for (const item of (obj.themes as unknown[]).slice(0, 5)) {
    if (!item || typeof item !== "object") continue;
    const t = item as Record<string, unknown>;

    const theme = typeof t.theme === "string" ? t.theme.trim() : "";
    const count = typeof t.count === "number" && t.count >= 1 ? Math.round(t.count) : 0;
    const description = typeof t.description === "string" ? t.description.trim() : "";
    const suggestedRule = typeof t.suggestedRule === "string" ? t.suggestedRule.trim() : "";

    if (theme.length === 0 || count < 1 || suggestedRule.length === 0) continue;

    themes.push({ theme, count, description, suggestedRule });
  }

  // Asegurar orden descendente por count
  themes.sort((a, b) => b.count - a.count);

  return { themes };
}
