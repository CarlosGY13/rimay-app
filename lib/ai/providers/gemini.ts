import { GoogleGenAI } from "@google/genai";
import type { AIProvider, AIRequest, AIResponse } from "../provider";
import { buildBasicPrompt } from "../prompt";

// Adaptador de Gemini (SDK oficial @google/genai). Lee la API key de
// GEMINI_API_KEY (nunca hardcodeada). Igual que el de OpenAI: prompt básico
// y respuesta cruda, sin parsing estructurado (eso llega en la Tarea 5).
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
    const prompt = buildBasicPrompt(input);

    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: prompt,
    });

    const text = response.text ?? "";

    return { text, needsHumanReview: false };
  }
}
