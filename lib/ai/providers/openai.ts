import OpenAI from "openai";
import type { AIProvider, AIRequest, AIResponse } from "../provider";
import { buildSystemPrompt } from "../prompt";
import { OPENAI_RESPONSE_SCHEMA, parseStructuredResponse } from "../schema";

// Adaptador de OpenAI. Lee la API key de OPENAI_API_KEY (nunca hardcodeada) y
// usa structured outputs (json_schema) para forzar la forma de la respuesta.
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
    const system = buildSystemPrompt(input.business);

    // Historial: user -> "user"; agente/operador -> "assistant".
    const historial = input.history.map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: system },
        ...historial,
        { role: "user", content: input.message },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "rimay_response",
          strict: true,
          schema: OPENAI_RESPONSE_SCHEMA,
        },
      },
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const parsed = parseStructuredResponse(raw);

    return {
      text: parsed.reply,
      needsHumanReview: parsed.needsHumanReview,
      reviewReason: parsed.reviewReason,
    };
  }
}
