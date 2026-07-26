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

export type AIOrderItem = { nombre: string; precio: number };
export type AIOrder = { items: AIOrderItem[]; total: number };

export type AIResponse = {
  // Texto de respuesta que se le muestra al cliente.
  text: string;
  // Si la consulta debe escalar a un humano (decidido por el modelo).
  needsHumanReview: boolean;
  // Motivo de la escalada (solo cuando needsHumanReview es true), para que
  // el operador entienda por qué sin leer todo el historial.
  reviewReason: string | null;
  // Pedido confirmado por el cliente (items + total del catálogo). null si
  // todavía no hay un pedido cerrado.
  order: AIOrder | null;
};

// ---- Extracción de catálogo desde una imagen de carta/menú ----

export type ExtractedCatalogItem = {
  nombre: string;
  precio: number;
  categoria?: string | null;
};

export type MenuExtractionRequest = {
  // Imagen de la carta en base64 (sin el prefijo data:).
  imageBase64: string;
  mimeType: string;
  rubro: string;
};

export interface AIProvider {
  generateResponse(input: AIRequest): Promise<AIResponse>;
  // Analiza una imagen de carta/menú y extrae los ítems que aparecen en ella.
  // NO debe inventar ítems ni precios: solo lo que esté en la imagen.
  extractCatalogItems(
    input: MenuExtractionRequest
  ): Promise<ExtractedCatalogItem[]>;
}
