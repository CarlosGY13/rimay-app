import OpenAI from "openai";
import type { AIProvider, AIRequest, AIResponse } from "../provider";
import { buildBasicPrompt } from "../prompt";

// Adaptador de OpenAI. Lee la API key de OPENAI_API_KEY (nunca hardcodeada).
// Por ahora arma un prompt básico y devuelve la respuesta del modelo tal
// cual, sin parsing estructurado (eso llega en la Tarea 5).
export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY no está configurada. Definila en el entorno para usar el proveedor OpenAI."
      );
    }
    this.client = new OpenAI({ apiKey });
    this.model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  }

  async generateResponse(input: AIRequest): Promise<AIResponse> {
    const prompt = buildBasicPrompt(input);

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content:
            "Eres un asistente de atención al cliente para pequeños negocios.",
        },
        { role: "user", content: prompt },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? "";

    return { text, needsHumanReview: false };
  }
}
