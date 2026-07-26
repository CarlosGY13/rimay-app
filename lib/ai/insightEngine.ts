import { getProvider } from "./getProvider";
import {
  OPENAI_INSIGHT_EXTRACTION_SCHEMA,
  OPENAI_INSIGHT_AGGREGATION_SCHEMA,
} from "./insights";

// Llama al proveedor de IA con un prompt de insights y devuelve la salida
// cruda como string JSON. El caller se encarga de parsear con el parser
// apropiado (parseInsightOutput o parseAggregationOutput).
//
// Internamente usa el mismo proveedor configurado (OpenAI o Gemini) pero
// con el schema de insights en vez del de respuesta al cliente.
export async function generateStructuredInsight(
  prompt: string,
  type: "extraction" | "aggregation"
): Promise<string> {
  const provider = getProvider();

  // Usamos el método generateResponse del provider pero necesitamos llamar
  // al LLM directamente con un schema diferente. Dado que la interfaz
  // AIProvider no expone un método genérico, construimos la llamada ad-hoc
  // usando la variable de entorno para determinar el proveedor.
  const providerType = process.env.AI_PROVIDER;

  if (providerType === "openai") {
    return callOpenAI(prompt, type);
  } else if (providerType === "gemini") {
    return callGemini(prompt, type);
  }

  throw new Error(`Proveedor de IA no soportado para insights: ${providerType}`);
}

async function callOpenAI(prompt: string, type: "extraction" | "aggregation"): Promise<string> {
  const OpenAI = (await import("openai")).default;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY no configurada.");

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const schema = type === "extraction"
    ? OPENAI_INSIGHT_EXTRACTION_SCHEMA
    : OPENAI_INSIGHT_AGGREGATION_SCHEMA;

  const schemaName = type === "extraction"
    ? "rimay_insight_extraction"
    : "rimay_insight_aggregation";

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: "Analizá y devolvé tu resultado en el formato estructurado." },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: schemaName,
        strict: true,
        schema,
      },
    },
  });

  return completion.choices[0]?.message?.content ?? "";
}

async function callGemini(prompt: string, type: "extraction" | "aggregation"): Promise<string> {
  const { GoogleGenAI, Type } = await import("@google/genai");
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY no configurada.");

  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

  const schema = type === "extraction"
    ? {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          hadFriction: { type: Type.BOOLEAN },
        },
        required: ["summary", "tags", "hadFriction"],
      }
    : {
        type: Type.OBJECT,
        properties: {
          themes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                theme: { type: Type.STRING },
                count: { type: Type.NUMBER },
                description: { type: Type.STRING },
                suggestedRule: { type: Type.STRING },
              },
              required: ["theme", "count", "description", "suggestedRule"],
            },
          },
        },
        required: ["themes"],
      };

  const response = await ai.models.generateContent({
    model,
    contents: [
      { role: "user", parts: [{ text: "Analizá y devolvé tu resultado en el formato estructurado." }] },
    ],
    config: {
      systemInstruction: prompt,
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  return response.text ?? "";
}
