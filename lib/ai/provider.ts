import type { Tono } from "@/lib/types";

// ============================================================
// Capa de abstracción de proveedor de IA
//
// Interfaz común a todos los proveedores (OpenAI, Gemini, …). El motor
// de IA (Tarea 5) se escribe una sola vez contra esta interfaz; cambiar
// de proveedor es cuestión de configuración, no de código.
//
// Es agnóstica del proveedor y de la lógica de negocio interna. El
// formato de salida estructurada del LLM (function calling / JSON schema,
// reglas de "nunca inventar precios", lógica real de needsHumanReview)
// se diseña en la Tarea 5; acá solo dejamos el cable y los tipos.
// ============================================================

// Un mensaje del historial reciente de la conversación.
export type AIMessage = {
  role: "user" | "agent" | "operator";
  content: string;
};

// Ítem de catálogo tal como lo necesita el prompt (subset de negocio).
export type AICatalogItem = {
  nombre: string;
  precio: number;
  descripcion?: string;
  // Atributos específicos por rubro (persistidos como JSON en la Tarea 2/3).
  categoria?: string;
  tallas?: string[];
  color?: string;
  duracion?: string;
};

// Contexto del negocio (persistido en Postgres desde la Tarea 3).
export type AIBusinessContext = {
  nombre: string;
  rubro: string;
  tono: Tono;
  catalogo: AICatalogItem[];
  reglas: string[];
};

export type AIRequest = {
  // Mensaje actual del cliente.
  message: string;
  // Historial reciente de la conversación (más viejo → más nuevo).
  history: AIMessage[];
  // Contexto del negocio contra el cual responder.
  business: AIBusinessContext;
};

export type AIResponse = {
  // Texto de respuesta que se le muestra al cliente.
  text: string;
  // Si la consulta debe escalar a un humano (decidido por el modelo).
  needsHumanReview: boolean;
  // Motivo de la escalada (solo cuando needsHumanReview es true), para que
  // el operador entienda por qué sin leer todo el historial.
  reviewReason: string | null;
};

export interface AIProvider {
  generateResponse(input: AIRequest): Promise<AIResponse>;
}
