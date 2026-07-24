import { GoogleGenAI, Type, type Content } from "@google/genai";
import type { AIProvider, AIRequest, AIResponse } from "../provider";
import { buildSystemPrompt } from "../prompt";
import { parseStructuredResponse } from "../schema";

// Schema de salida para Gemini (responseSchema). Equivalente al de OpenAI.
const GEMINI_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    reply: { type: Type.STRING },
    needsHumanReview: { type: Type.BOOLEAN },
    reviewReason: { type: Type.STRING, nullable: true },
  },
  required: ["reply", "needsHumanReview", "reviewReason"],
};

// Adaptador de Gemini (SDK oficial @google/genai). Lee GEMINI_API_KEY y usa
// responseSchema + responseMimeType JSON para forzar la salida estructurada.
export class GeminiProvider implements AIProvider {
  private ai: GoogleGenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY no está configurada. Definila en el entorno para usar el proveedor Gemini."
      );
    }
    this.ai = new GoogleGenAI({ apiKey });
    this.model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  }

  async generateResponse(input: AIRequest): Promise<AIResponse> {
    const system = buildSystemPrompt(input.business);

    // Historial: user -> "user"; agente/operador -> "model".
    const historial: Content[] = input.history.map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: [
        ...historial,
        { role: "user", parts: [{ text: input.message }] },
      ],
      config: {
        systemInstruction: system,
        responseMimeType: "application/json",
        responseSchema: GEMINI_RESPONSE_SCHEMA,
      },
    });

    const raw = response.text ?? "";
    const parsed = parseStructuredResponse(raw);

    return {
      text: parsed.reply,
      needsHumanReview: parsed.needsHumanReview,
      reviewReason: parsed.reviewReason,
    };
  }
}
